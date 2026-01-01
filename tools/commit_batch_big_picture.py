#!/usr/bin/env python3
"""
commit_batch_big_picture - Automate diff generation for ranges of commits

This tool automates the process of creating git diffs for selected commits,
showing changes per commit, along with metadata and status checks.
"""

import argparse
import hashlib
import json
import os
import re
import shlex
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple


class SelectionParseError(ValueError):
    """Raised when a commit selection string cannot be parsed."""


def run_command(cmd: str, check: bool = True, capture_output: bool = True) -> str:
    """Run a shell command and return the result."""
    result = subprocess.run(
        cmd,
        shell=True,
        check=check,
        capture_output=capture_output,
        text=True,
    )
    return result.stdout.strip() if capture_output else ""


def run_command_with_status(cmd: str) -> Tuple[int, str]:
    """Run a shell command and return the status code and output."""
    result = subprocess.run(
        cmd,
        shell=True,
        check=False,
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout.strip()


def resolve_commit(token: str, original: str) -> str:
    cleaned = token.strip()
    if not cleaned:
        raise SelectionParseError(
            f"Invalid commit selection token '{token}' in '{original}'. "
            "Commit hashes cannot be empty."
        )
    try:
        resolved = run_command(
            f"git rev-parse --verify {shlex.quote(cleaned)}^{{commit}}"
        )
    except subprocess.CalledProcessError as exc:
        raise SelectionParseError(
            f"Invalid commit selection token '{token}' in '{original}': "
            "Commit hash not found."
        ) from exc
    return resolved


def parse_commit_selection(selection: str) -> List[str]:
    """Parse a selection string into an ordered list of unique commits."""
    original = selection
    trimmed = selection.strip()
    if not trimmed:
        raise SelectionParseError(
            "Invalid commit selection: empty input. "
            "Expected format like 'abc123,def456-789abc'."
        )

    segments = [segment.strip() for segment in trimmed.split(",")]
    if any(segment == "" for segment in segments):
        raise SelectionParseError(
            f"Invalid commit selection segment '' in '{original}'. "
            "Expected format like 'abc123,def456-789abc'."
        )

    selected: List[str] = []
    seen: Set[str] = set()

    for segment in segments:
        cleaned = re.sub(r"\s+", "", segment)
        if not cleaned:
            raise SelectionParseError(
                f"Invalid commit selection segment '{segment}' in '{original}'. "
                "Expected format like 'abc123,def456-789abc'."
            )

        if "-" in cleaned:
            if cleaned.count("-") != 1:
                raise SelectionParseError(
                    f"Invalid commit range '{segment}' in '{original}'. "
                    "Expected format like 'abc123-789abc'."
                )
            start_token, end_token = cleaned.split("-", 1)
            start = resolve_commit(start_token, original)
            end = resolve_commit(end_token, original)
            status, _ = run_command_with_status(
                f"git merge-base --is-ancestor {shlex.quote(start)} {shlex.quote(end)}"
            )
            if status != 0:
                raise SelectionParseError(
                    f"Invalid commit range '{segment}' in '{original}': "
                    "start must be an ancestor of end."
                )
            commits_raw = run_command(
                f"git rev-list --reverse {shlex.quote(start)}^..{shlex.quote(end)}"
            )
            commits = [line for line in commits_raw.splitlines() if line]
            if not commits:
                raise SelectionParseError(
                    f"Invalid commit range '{segment}' in '{original}': no commits found."
                )
            for commit in commits:
                if commit not in seen:
                    seen.add(commit)
                    selected.append(commit)
        else:
            commit = resolve_commit(cleaned, original)
            if commit not in seen:
                seen.add(commit)
                selected.append(commit)

    if not selected:
        raise SelectionParseError(
            f"Invalid commit selection '{original}': no commits parsed."
        )

    return selected


def format_commit_selection(commits: List[str]) -> str:
    """Format a list of commits into a canonical short-hash selection string."""
    return ",".join(commit[:8] for commit in commits)


def build_selection_tag(selected_commits: List[str], selection_canonical: str) -> str:
    selection_hash = hashlib.sha1(selection_canonical.encode("utf-8")).hexdigest()[:8]
    if not selected_commits:
        return f"0commits-{selection_hash}"
    return (
        f"{selected_commits[0][:8]}-"
        f"{selected_commits[-1][:8]}-"
        f"{len(selected_commits)}commits-"
        f"{selection_hash}"
    )


def format_commit_list_preview(commits: List[str], max_items: int = 20, edge_items: int = 5) -> str:
    shortened = [commit[:8] for commit in commits]
    if len(shortened) <= max_items:
        return ", ".join(shortened)
    head = ", ".join(shortened[:edge_items])
    tail = ", ".join(shortened[-edge_items:])
    return f"{head} ... {tail}"


def selection_header_lines(
    selection_requested: str, selection_canonical: str, selected_commits: List[str]
) -> List[str]:
    lines = [
        f"# Commit selection (requested): {selection_requested}",
        f"# Commit selection (canonical): {selection_canonical}",
    ]
    if selected_commits:
        if len(selected_commits) <= 20:
            expanded = ", ".join(commit[:8] for commit in selected_commits)
            lines.append(
                f"# Expanded commits (count={len(selected_commits)}): {expanded}"
            )
        else:
            preview = format_commit_list_preview(selected_commits)
            lines.append(
                f"# Expanded commits: count={len(selected_commits)} "
                f"min={selected_commits[0][:8]} max={selected_commits[-1][:8]} "
                f"preview={preview}"
            )
    else:
        lines.append("# Expanded commits: count=0")
    return lines


def check_current_branch(expected_branch: str) -> None:
    """Ensure we're starting from the expected base branch."""
    current_branch = run_command("git branch --show-current")
    if current_branch != expected_branch:
        print(
            f"Error: Currently on branch '{current_branch}'. "
            f"This tool requires starting from '{expected_branch}' branch."
        )
        sys.exit(1)
    print(f"✓ Starting from {expected_branch} branch")


def checkout_base_branch(base_branch: str) -> None:
    """Checkout the base branch."""
    print(f"Checking out {base_branch} branch...")
    run_command(f"git checkout {shlex.quote(base_branch)}")
    print(f"✓ Checked out {base_branch} branch")


def fetch_remote_branches(remote: str) -> None:
    """Fetch latest remote branches."""
    print(f"Fetching remote branches from {remote}...")
    run_command(f"git fetch {shlex.quote(remote)} --prune --tags")
    print("✓ Fetched remote branches")


def get_repo_info() -> Tuple[str, str]:
    repo_json = run_command("gh repo view --json name,owner")
    data = json.loads(repo_json)
    owner = (data.get("owner") or {}).get("login") or ""
    name = data.get("name") or ""
    if not owner or not name:
        raise ValueError("Unable to resolve GitHub repository owner/name.")
    return owner, name


def get_commit_info(commit_sha: str) -> Dict[str, str]:
    """Get commit metadata for a specific commit."""
    format_str = "%H%n%h%n%an%n%ae%n%ad%n%s%n%b"
    raw = run_command(
        f"git show -s --date=iso-strict --format={shlex.quote(format_str)} {shlex.quote(commit_sha)}"
    )
    parts = raw.split("\n", 6)
    while len(parts) < 7:
        parts.append("")
    full_sha, short_sha, author_name, author_email, date, subject, body = parts
    return {
        "sha": full_sha,
        "short": short_sha,
        "author": author_name,
        "author_email": author_email,
        "date": date,
        "subject": subject,
        "body": body.strip(),
    }


def get_commit_changed_files(commit_sha: str) -> List[str]:
    """Get list of changed files for a specific commit."""
    files_raw = run_command(
        f"git diff-tree --no-commit-id --name-only -r {shlex.quote(commit_sha)}"
    )
    return [line for line in files_raw.splitlines() if line]


def get_commit_checks(owner: str, repo: str, commit_sha: str) -> List[Dict[str, str]]:
    """Get status check results for a specific commit."""
    checks_json = run_command(
        "gh api -H \"Accept: application/vnd.github+json\" "
        f"repos/{owner}/{repo}/commits/{shlex.quote(commit_sha)}/check-runs"
    )
    data = json.loads(checks_json)
    checks: List[Dict[str, str]] = []
    for check in data.get("check_runs") or []:
        output = check.get("output") or {}
        checks.append(
            {
                "name": check.get("name") or "unknown check",
                "status": check.get("status") or "unknown",
                "conclusion": check.get("conclusion") or "unknown",
                "detailsUrl": check.get("details_url") or "",
                "title": output.get("title") or "",
                "summary": output.get("summary") or output.get("text") or "",
            }
        )
    return checks


def extract_actions_run_id(details_url: str | None) -> str | None:
    """Extract the GitHub Actions run ID from a details URL."""
    if not details_url:
        return None
    match = re.search(r"/actions/runs/(\d+)", details_url)
    return match.group(1) if match else None


def get_failed_check_logs(check: Dict[str, str]) -> str | None:
    """Retrieve raw logs for failed GitHub Actions checks."""
    conclusion = (check.get("conclusion") or "").lower()
    if conclusion in {"success", "neutral", "skipped"}:
        return None

    run_id = extract_actions_run_id(check.get("detailsUrl") or "")
    if not run_id:
        return None

    try:
        print(
            f"Fetching logs for failed check '{check.get('name', 'unknown check')}' "
            f"(run {run_id})"
        )
        return run_command(f"gh run view {shlex.quote(run_id)} --log")
    except subprocess.CalledProcessError as exc:
        print(f"Warning: Failed to fetch logs for run {run_id}: {exc}")
        return None


def filter_excluded_files(files: List[str]) -> Tuple[List[str], List[str]]:
    """Filter files that should be excluded from documents."""
    excluded_files: List[str] = []
    included_files: List[str] = []

    for file_path in files:
        if Path(file_path).name == "package-lock.json":
            excluded_files.append(file_path)
        else:
            included_files.append(file_path)

    if excluded_files:
        print(f"Skipping {len(excluded_files)} excluded file(s): {', '.join(excluded_files)}")

    return included_files, excluded_files


def get_commit_parent(commit_sha: str) -> str | None:
    try:
        return run_command(f"git rev-parse {shlex.quote(commit_sha)}^")
    except subprocess.CalledProcessError:
        return None


def get_file_at_commit(commit_sha: str, file_path: str) -> str | None:
    try:
        return run_command(f"git show {shlex.quote(commit_sha)}:{shlex.quote(file_path)}")
    except subprocess.CalledProcessError:
        return None


def get_diff_for_file(commit_sha: str, file_path: str) -> str:
    parent = get_commit_parent(commit_sha)
    if parent:
        cmd = (
            f"git diff {shlex.quote(parent)} {shlex.quote(commit_sha)}"
            f" -- {shlex.quote(file_path)}"
        )
    else:
        cmd = f"git show {shlex.quote(commit_sha)} -- {shlex.quote(file_path)}"
    return run_command(cmd)


def run_commit_big_picture(
    commit_info: Dict[str, str],
    files: List[str],
    checks: List[Dict[str, str]],
    output_file: str,
    include_logs: bool = False,
) -> bool:
    """Generate a git diff summary for a commit."""
    print(f"Creating diff compilation for commit {commit_info['short']}...")

    if not files:
        print(f"Warning: No files found for commit {commit_info['short']}")
        return False

    parent = get_commit_parent(commit_info["sha"])
    files_arg = " ".join(shlex.quote(f) for f in files)
    if parent:
        diff_cmd = (
            f"git diff {shlex.quote(parent)} {shlex.quote(commit_info['sha'])}"
        )
    else:
        diff_cmd = f"git show {shlex.quote(commit_info['sha'])}"
    if files_arg:
        diff_cmd += f" -- {files_arg}"

    diff_output = run_command(diff_cmd)
    log_output = run_command(f"git show -s --stat {shlex.quote(commit_info['sha'])}")

    summary_text = " ".join(commit_info.get("body", "").split()) or "(no summary provided)"

    with open(output_file, "w", encoding="utf-8") as diff_file:
        diff_file.write(f"# Commit {commit_info['short']}: {commit_info['subject']}\n")
        diff_file.write(f"# SHA: {commit_info['sha']}\n")
        if parent:
            diff_file.write(f"# Parent: {parent}\n")
        diff_file.write(f"# Author: {commit_info.get('author', 'unknown')}\n")
        diff_file.write(f"# Author Email: {commit_info.get('author_email', '')}\n")
        diff_file.write(f"# Date: {commit_info.get('date', '')}\n")
        diff_file.write(f"# Summary: {summary_text}\n")
        diff_file.write(f"# Changed files: {len(files)}\n")
        diff_file.write(f"# Files: {', '.join(files)}\n\n")
        diff_file.write("=" * 80 + "\n")
        diff_file.write("Commit log:\n")
        diff_file.write(log_output if log_output else "# No commit log found\n")
        diff_file.write("\n\n")
        diff_file.write("=" * 80 + "\n")
        diff_file.write(diff_output if diff_output else "# No differences found\n")
        diff_file.write("\n\n")
        diff_file.write("=" * 80 + "\n")
        diff_file.write(f"Checks ({len(checks)}):\n")

        if not checks:
            diff_file.write("# No checks found\n")
        else:
            for check in checks:
                name = check.get("name") or "unknown check"
                status = check.get("status") or "unknown"
                conclusion = check.get("conclusion") or "unknown"
                details_url = check.get("detailsUrl") or ""
                log_output = check.get("logOutput") or ""
                heading = f"- {name}: status={status}, conclusion={conclusion}"
                if details_url:
                    heading += f" [{details_url}]"
                diff_file.write(heading + "\n")

                summary_text = check.get("summary") or check.get("title") or ""
                if summary_text:
                    for line in summary_text.splitlines():
                        diff_file.write(f"    {line}\n")
                if include_logs and log_output:
                    diff_file.write("    Logs:\n")
                    for line in log_output.splitlines():
                        diff_file.write(f"    {line}\n")

    print(f"✓ Created diff: {output_file}")
    return True


def create_master_comparison(
    commit_files: List[Tuple[Dict[str, str], str]],
    selection_requested: str,
    selection_canonical: str,
    selected_commits: List[str],
    output_file: str,
    include_logs: bool = False,
) -> bool:
    """Create a master comparison file combining all individual commit diff files."""
    print("Creating master comparison file...")

    if not commit_files:
        print("Warning: No individual commit files found for master comparison")
        return False

    with open(output_file, "w", encoding="utf-8") as outf:
        log_note = " (with logs)" if include_logs else ""
        outf.write(f"# Master Comparison{log_note}\n")
        for line in selection_header_lines(
            selection_requested, selection_canonical, selected_commits
        ):
            outf.write(f"{line}\n")
        outf.write(f"# Total commits: {len(commit_files)}\n")
        outf.write(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        outf.write("=" * 80 + "\n\n")

        for idx, (commit_info, commit_file) in enumerate(commit_files, 1):
            outf.write("\n" + "=" * 80 + "\n")
            outf.write(
                f"# Commit {idx}/{len(commit_files)} - {commit_info['short']}: "
                f"{commit_info['subject']}\n"
            )
            outf.write("=" * 80 + "\n\n")

            with open(commit_file, "r", encoding="utf-8") as inf:
                outf.write(inf.read())

            outf.write("\n\n")

    print(f"✓ Created master comparison: {output_file}")
    return True


def create_summary_compilation(
    commit_files: List[Tuple[Dict[str, str], str]],
    selection_requested: str,
    selection_canonical: str,
    selected_commits: List[str],
    output_file: str,
    include_logs: bool = False,
) -> bool:
    """Create a concise summary document for all processed commits."""
    print("Creating summary compilation file...")

    if not commit_files:
        print("Warning: No commits available to summarize")
        return False

    with open(output_file, "w", encoding="utf-8") as outf:
        log_note = " (with logs)" if include_logs else ""
        outf.write(f"# Commit Summary Compilation{log_note}\n")
        for line in selection_header_lines(
            selection_requested, selection_canonical, selected_commits
        ):
            outf.write(f"{line}\n")
        outf.write(f"# Total commits: {len(commit_files)}\n")
        outf.write(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        outf.write("=" * 80 + "\n\n")

        for idx, (commit_info, commit_file) in enumerate(commit_files, 1):
            summary_text = " ".join(commit_info.get("body", "").split()) or "(no summary provided)"

            outf.write(
                f"## Commit {idx}/{len(commit_files)} - {commit_info['short']}: "
                f"{commit_info['subject']}\n"
            )
            outf.write(f"- Author: {commit_info.get('author', 'unknown')}\n")
            outf.write(f"- Date: {commit_info.get('date', '')}\n")
            outf.write(f"- Summary: {summary_text}\n")
            outf.write(f"- Detailed file: {commit_file}\n")
            outf.write("\n")

    print(f"✓ Created summary compilation: {output_file}")
    return True


def create_touched_files_compilation(
    commits: List[Dict[str, object]],
    selection_requested: str,
    selection_canonical: str,
    selected_commits: List[str],
    output_file: str,
    master_comparison_file: str | None = None,
) -> bool:
    """Create a compilation of touched files with before/after content per commit."""
    print("Creating touched files compilation...")

    if not commits:
        print("Warning: No commits available for touched files compilation")
        return False

    with open(output_file, "w", encoding="utf-8") as outf:
        outf.write("# Touched Files (per commit)\n")
        for line in selection_header_lines(
            selection_requested, selection_canonical, selected_commits
        ):
            outf.write(f"{line}\n")
        outf.write(f"# Total commits: {len(commits)}\n")
        outf.write(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        outf.write("=" * 80 + "\n\n")

        for commit in commits:
            commit_info = commit.get("info")
            files = commit.get("files")
            if not isinstance(commit_info, dict) or not isinstance(files, list):
                continue

            outf.write("=" * 80 + "\n")
            outf.write(
                f"# Commit {commit_info.get('short', '')}: "
                f"{commit_info.get('subject', '')}\n"
            )
            outf.write(f"# SHA: {commit_info.get('sha', '')}\n")
            outf.write(f"# Files touched: {len(files)}\n\n")

            for file_path in files:
                outf.write("-" * 80 + "\n")
                outf.write(f"# File: {file_path}\n")
                outf.write("# Before (parent)\n")
                parent = get_commit_parent(commit_info.get("sha", ""))
                before = get_file_at_commit(parent, file_path) if parent else None
                if before is None:
                    outf.write("# File did not exist in parent\n")
                else:
                    outf.write(before)
                    if not before.endswith("\n"):
                        outf.write("\n")

                outf.write("\n# After (commit)\n")
                after = get_file_at_commit(commit_info.get("sha", ""), file_path)
                if after is None:
                    outf.write("# File removed in commit\n")
                else:
                    outf.write(after)
                    if not after.endswith("\n"):
                        outf.write("\n")

                outf.write("\n# Diff\n")
                diff_output = get_diff_for_file(commit_info.get("sha", ""), file_path)
                outf.write(diff_output if diff_output else "# No diff output\n")
                if diff_output and not diff_output.endswith("\n"):
                    outf.write("\n")
                outf.write("\n")

        if master_comparison_file and os.path.exists(master_comparison_file):
            outf.write("=" * 80 + "\n")
            outf.write("# Appended master comparison (diffs and summaries)\n\n")
            with open(master_comparison_file, "r", encoding="utf-8") as master_file:
                outf.write(master_file.read())

    print(f"✓ Created touched files compilation: {output_file}")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Automate diff generation for selected commits",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "commit_selection",
        nargs="?",
        help=(
            "Commit selection string like 'abc123,def456-789abc'. "
            "Accepts commas, ranges, whitespace, and commit refs."
        ),
    )
    parser.add_argument(
        "--commits",
        dest="commit_selection",
        help=(
            "Alias for the commit selection string. "
            "Examples: 'abc123,def456-789abc'."
        ),
    )
    parser.add_argument(
        "--base-branch",
        default="main",
        help="Base branch to start from (default: main)",
    )
    parser.add_argument(
        "--remote",
        default="origin",
        help="Remote name to fetch commits from (default: origin)",
    )
    parser.add_argument(
        "--output-dir",
        default="/tmp",
        help="Directory where output files will be written (default: /tmp)",
    )
    parser.add_argument(
        "--no-cleanup",
        action="store_true",
        help="Don't return to the base branch at the end",
    )

    args = parser.parse_args()

    if not args.commit_selection:
        parser.error("commit_selection is required (e.g. 'abc123,def456-789abc').")

    try:
        selected_commits = parse_commit_selection(args.commit_selection)
    except SelectionParseError as exc:
        parser.error(str(exc))

    selection_requested = args.commit_selection
    selection_canonical_full = ",".join(selected_commits)
    selection_canonical = format_commit_selection(selected_commits)
    selection_tag = build_selection_tag(selected_commits, selection_canonical_full)

    print(f"Requested commit selection: {selection_requested}")
    print(f"Canonical commit selection: {selection_canonical}")
    if selected_commits:
        preview = format_commit_list_preview(selected_commits)
        print(
            f"Expanded commits: count={len(selected_commits)} "
            f"min={selected_commits[0][:8]} max={selected_commits[-1][:8]} preview={preview}"
        )

    check_current_branch(args.base_branch)

    try:
        fetch_remote_branches(args.remote)
        owner, repo = get_repo_info()

        print(f"Collecting info for commit selection: {selection_canonical}...")
        commit_infos: List[Dict[str, str]] = []
        missing_commits: List[str] = []

        for commit_sha in selected_commits:
            try:
                commit_info = get_commit_info(commit_sha)
                commit_infos.append(commit_info)
                print(
                    f"  Commit {commit_info['short']}: {commit_info['subject']}"
                )
            except (subprocess.CalledProcessError, IndexError) as exc:
                print(f"  Commit {commit_sha[:8]}: Not found or inaccessible ({exc})")
                missing_commits.append(commit_sha)

        if not commit_infos:
            print("Error: No valid commits found for the requested selection")
            sys.exit(1)

        successful_commits: List[Tuple[Dict[str, str], str]] = []
        successful_commits_with_logs: List[Tuple[Dict[str, str], str]] = []
        processed_commits: List[Dict[str, object]] = []

        for commit_info in commit_infos:
            print(
                f"\n--- Processing commit {commit_info['short']}: "
                f"{commit_info['subject']} ---"
            )

            try:
                all_files = get_commit_changed_files(commit_info["sha"])
            except subprocess.CalledProcessError as exc:
                print(f"Failed to retrieve files for commit {commit_info['short']}: {exc}")
                continue

            if not all_files:
                print(f"No changed files found for commit {commit_info['short']}")
                continue

            print(f"Total changed files: {len(all_files)}")

            included_files, _excluded_files = filter_excluded_files(all_files)
            if not included_files:
                print(
                    f"No files to process for commit {commit_info['short']} "
                    "(all files were excluded)"
                )
                continue

            print(
                f"Files to process ({len(included_files)}): {', '.join(included_files)}"
            )

            try:
                checks_with_logs: List[Dict[str, str]] = []
                checks = get_commit_checks(owner, repo, commit_info["sha"])
            except (subprocess.CalledProcessError, json.JSONDecodeError, KeyError, ValueError) as exc:
                print(f"Failed to retrieve checks for commit {commit_info['short']}: {exc}")
                checks = []
                checks_with_logs = []
            else:
                for check in checks:
                    check_copy = dict(check)
                    logs = get_failed_check_logs(check_copy)
                    if logs:
                        check_copy["logOutput"] = logs
                    checks_with_logs.append(check_copy)

            output_file = os.path.join(
                args.output_dir,
                f"commit-{commit_info['short']}-implementation.txt",
            )
            output_file_with_logs = os.path.join(
                args.output_dir,
                f"commit-{commit_info['short']}-implementation-with-logs.txt",
            )

            if run_commit_big_picture(
                commit_info,
                included_files,
                checks,
                output_file,
                include_logs=False,
            ):
                successful_commits.append((commit_info, output_file))
                processed_commits.append(
                    {
                        "info": commit_info,
                        "file": output_file,
                        "files": included_files,
                    }
                )
            if run_commit_big_picture(
                commit_info,
                included_files,
                checks_with_logs,
                output_file_with_logs,
                include_logs=True,
            ):
                successful_commits_with_logs.append((commit_info, output_file_with_logs))

        if successful_commits:
            requested_count = len(selected_commits)
            processed_shas = {info["sha"] for info, _ in successful_commits}
            processed_count = len(processed_shas)
            skipped_commits = [
                commit for commit in selected_commits if commit not in processed_shas
            ]
            print(
                f"\nRequested commit count: {requested_count}; "
                f"processed commit count: {processed_count}"
            )
            if missing_commits:
                missing_short = ", ".join(commit[:8] for commit in missing_commits)
                print(f"Missing/inaccessible commits: {missing_short}")
            if skipped_commits:
                skipped_short = ", ".join(commit[:8] for commit in skipped_commits)
                print(f"Skipped commits after processing: {skipped_short}")

            master_output = os.path.join(
                args.output_dir, f"commit-comparison-{selection_tag}.txt"
            )
            create_master_comparison(
                successful_commits,
                selection_requested,
                selection_canonical,
                selected_commits,
                master_output,
            )

            summary_output = os.path.join(
                args.output_dir, f"commit-summaries-{selection_tag}.txt"
            )
            create_summary_compilation(
                successful_commits,
                selection_requested,
                selection_canonical,
                selected_commits,
                summary_output,
            )

            touched_output = os.path.join(
                args.output_dir, f"commit-touched-files-{selection_tag}.txt"
            )
            create_touched_files_compilation(
                processed_commits,
                selection_requested,
                selection_canonical,
                selected_commits,
                touched_output,
                master_output,
            )

            print(f"\n✓ Successfully processed {len(successful_commits)} commit(s) (without logs)")
            print(f"✓ Individual files: {args.output_dir}/commit-{{sha}}-implementation.txt")
            print(f"✓ Master comparison: {master_output}")
            print(f"✓ Summary compilation: {summary_output}")
            print(f"✓ Touched files compilation: {touched_output}")
        else:
            print("\nNo commits were successfully processed (without logs)")

        if successful_commits_with_logs:
            master_output_with_logs = os.path.join(
                args.output_dir, f"commit-comparison-{selection_tag}-with-logs.txt"
            )
            create_master_comparison(
                successful_commits_with_logs,
                selection_requested,
                selection_canonical,
                selected_commits,
                master_output_with_logs,
                include_logs=True,
            )

            summary_output_with_logs = os.path.join(
                args.output_dir, f"commit-summaries-{selection_tag}-with-logs.txt"
            )
            create_summary_compilation(
                successful_commits_with_logs,
                selection_requested,
                selection_canonical,
                selected_commits,
                summary_output_with_logs,
                include_logs=True,
            )

            touched_output_with_logs = os.path.join(
                args.output_dir, f"commit-touched-files-{selection_tag}-with-logs.txt"
            )
            create_touched_files_compilation(
                processed_commits,
                selection_requested,
                selection_canonical,
                selected_commits,
                touched_output_with_logs,
                master_output_with_logs,
            )

            print(f"\n✓ Successfully processed {len(successful_commits_with_logs)} commit(s) (with logs)")
            print(
                f"✓ Individual files (with logs): {args.output_dir}/commit-{{sha}}-implementation-with-logs.txt"
            )
            print(f"✓ Master comparison (with logs): {master_output_with_logs}")
            print(f"✓ Summary compilation (with logs): {summary_output_with_logs}")
            print(f"✓ Touched files compilation (with logs): {touched_output_with_logs}")
        else:
            print("\nNo commits were successfully processed (with logs)")

    except KeyboardInterrupt:
        print("\nInterrupted by user")
    finally:
        if not args.no_cleanup:
            try:
                checkout_base_branch(args.base_branch)
                print(f"✓ Returned to {args.base_branch} branch")
            except subprocess.CalledProcessError:
                print(f"Warning: Failed to return to {args.base_branch} branch")


if __name__ == "__main__":
    main()
