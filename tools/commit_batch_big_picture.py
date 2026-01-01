#!/usr/bin/env python3
"""
commit_batch_big_picture - Automate diff generation for ranges of commits

This tool automates the process of creating git diffs and touched file
compilations for specific commits, including status checks and logs.
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


def resolve_commit(token: str) -> str:
    """Resolve a commit reference to a full SHA."""
    cleaned = token.strip()
    if cleaned == "":
        raise SelectionParseError("Invalid commit selection token: empty value.")
    if not re.fullmatch(r"[0-9a-fA-F]{7,40}", cleaned):
        raise SelectionParseError(
            f"Invalid commit selection token '{token}': "
            "expected a commit hash (7-40 hex characters)."
        )

    ref = f"{cleaned}^{{commit}}"
    try:
        return run_command(f"git rev-parse --verify {shlex.quote(ref)}")
    except subprocess.CalledProcessError as exc:
        raise SelectionParseError(
            f"Invalid commit selection token '{token}': commit not found."
        ) from exc


def get_commit_parent(commit_sha: str) -> str | None:
    parents = run_command(f"git rev-list --parents -n 1 {shlex.quote(commit_sha)}")
    parts = parents.split()
    if len(parts) >= 2:
        return parts[1]
    return None


def expand_commit_range(start: str, end: str) -> List[str]:
    if start == end:
        return [start]

    try:
        run_command(
            f"git merge-base --is-ancestor {shlex.quote(start)} {shlex.quote(end)}"
        )
    except subprocess.CalledProcessError as exc:
        raise SelectionParseError(
            f"Invalid commit range '{start}-{end}': "
            "start must be an ancestor of end."
        ) from exc

    start_parent = get_commit_parent(start)
    if start_parent:
        rev_range = f"{start}^..{end}"
    else:
        rev_range = f"{start}..{end}"

    commits = run_command(f"git rev-list --reverse {shlex.quote(rev_range)}")
    commit_list = [line.strip() for line in commits.splitlines() if line.strip()]

    if not commit_list:
        raise SelectionParseError(
            f"Invalid commit range '{start}-{end}': no commits found."
        )

    if not start_parent and start not in commit_list:
        commit_list.insert(0, start)

    return commit_list


def parse_commit_selection(selection: str) -> List[str]:
    """Parse a selection string into a list of unique commit SHAs."""
    original = selection
    trimmed = selection.strip()
    if not trimmed:
        raise SelectionParseError(
            "Invalid commit selection: empty input. "
            "Expected format like 'abc1234,def5678-9999999'."
        )

    segments = [segment.strip() for segment in trimmed.split(",")]
    if any(segment == "" for segment in segments):
        raise SelectionParseError(
            f"Invalid commit selection segment '' in '{original}'. "
            "Expected format like 'abc1234,def5678-9999999'."
        )

    selected: List[str] = []
    seen: Set[str] = set()

    for segment in segments:
        cleaned = re.sub(r"\s+", "", segment)
        if not cleaned:
            raise SelectionParseError(
                f"Invalid commit selection segment '{segment}' in '{original}'. "
                "Expected format like 'abc1234,def5678-9999999'."
            )

        parts = cleaned.split("-")
        if len(parts) == 1:
            commit_sha = resolve_commit(parts[0])
            if commit_sha not in seen:
                selected.append(commit_sha)
                seen.add(commit_sha)
        elif len(parts) == 2:
            start = resolve_commit(parts[0])
            end = resolve_commit(parts[1])
            for commit_sha in expand_commit_range(start, end):
                if commit_sha not in seen:
                    selected.append(commit_sha)
                    seen.add(commit_sha)
        else:
            raise SelectionParseError(
                f"Invalid commit selection segment '{segment}' in '{original}'. "
                "Expected format like 'abc1234,def5678-9999999'."
            )

    if not selected:
        raise SelectionParseError(
            f"Invalid commit selection '{original}': no commits parsed."
        )

    return selected


def format_commit_selection(commits: List[str]) -> str:
    """Format commit list into a canonical selection string."""
    return ",".join(commits)


def build_selection_tag(selected_commits: List[str], selection_canonical: str) -> str:
    selection_hash = hashlib.sha1(selection_canonical.encode("utf-8")).hexdigest()[:8]
    if not selected_commits:
        return f"0commits-{selection_hash}"
    min_commit = selected_commits[0][:7]
    max_commit = selected_commits[-1][:7]
    return f"{min_commit}-{max_commit}-{len(selected_commits)}commits-{selection_hash}"


def format_commit_list_preview(commits: List[str], max_items: int = 20, edge_items: int = 5) -> str:
    short_commits = [commit[:7] for commit in commits]
    if len(short_commits) <= max_items:
        return ", ".join(short_commits)
    head = ", ".join(short_commits[:edge_items])
    tail = ", ".join(short_commits[-edge_items:])
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
            expanded = ", ".join(commit[:7] for commit in selected_commits)
            lines.append(f"# Expanded commits (count={len(selected_commits)}): {expanded}")
        else:
            preview = format_commit_list_preview(selected_commits)
            lines.append(
                f"# Expanded commits: count={len(selected_commits)} "
                f"min={selected_commits[0][:7]} max={selected_commits[-1][:7]} "
                f"preview={preview}"
            )
    else:
        lines.append("# Expanded commits: count=0")
    return lines


def get_repo_name_with_owner() -> str:
    repo_info = run_command("gh repo view --json nameWithOwner")
    data = json.loads(repo_info)
    return data["nameWithOwner"]


def get_commit_info(commit_sha: str, repo: str) -> Dict[str, str]:
    """Get metadata for a specific commit."""
    format_token = "%H%x1f%h%x1f%an%x1f%ae%x1f%ad%x1f%s%x1f%b"
    info = run_command(
        f"git show -s --format={shlex.quote(format_token)} {shlex.quote(commit_sha)}"
    )
    parts = info.split("\x1f")
    if len(parts) < 7:
        raise RuntimeError(f"Unexpected git show output for {commit_sha}")

    full_sha, short_sha, author_name, author_email, date, title, body = parts[:7]
    return {
        "sha": full_sha,
        "short": short_sha,
        "author": author_name,
        "authorEmail": author_email,
        "date": date,
        "title": title,
        "body": body,
        "url": f"https://github.com/{repo}/commit/{full_sha}",
    }


def get_commit_changed_files(commit_sha: str) -> List[str]:
    """Get list of changed files for a specific commit."""
    files = run_command(
        f"git show --name-only --pretty=format: {shlex.quote(commit_sha)}"
    )
    return [line.strip() for line in files.splitlines() if line.strip()]


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


def get_commit_checks(commit_sha: str, repo: str) -> List[Dict[str, str]]:
    """Get status check results for a specific commit."""
    checks_json = run_command(
        f"gh api repos/{shlex.quote(repo)}/commits/{shlex.quote(commit_sha)}/check-runs"
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
                "summary": output.get("summary") or "",
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


def load_file_content(commit_sha: str, file_path: str) -> str | None:
    try:
        return run_command(
            f"git show {shlex.quote(commit_sha)}:{shlex.quote(file_path)}"
        )
    except subprocess.CalledProcessError:
        return None


def generate_file_diff(commit_sha: str, file_path: str, parent_sha: str | None) -> str:
    if parent_sha:
        diff_cmd = (
            f"git diff {shlex.quote(parent_sha)} {shlex.quote(commit_sha)}"
            f" -- {shlex.quote(file_path)}"
        )
    else:
        diff_cmd = (
            f"git show {shlex.quote(commit_sha)} --pretty=format: -- {shlex.quote(file_path)}"
        )
    return run_command(diff_cmd)


def write_file_section(
    outf,
    file_path: str,
    commit_sha: str,
    parent_sha: str | None,
) -> None:
    outf.write("=" * 80 + "\n")
    outf.write(f"# File: {file_path}\n")
    if parent_sha:
        outf.write(f"# Parent: {parent_sha}\n")
    outf.write(f"# Commit: {commit_sha}\n\n")

    before_contents = load_file_content(parent_sha, file_path) if parent_sha else None
    after_contents = load_file_content(commit_sha, file_path)

    outf.write("--- Before ---\n")
    if before_contents is None:
        outf.write("(file did not exist)\n")
    else:
        outf.write(before_contents)
        if not before_contents.endswith("\n"):
            outf.write("\n")

    outf.write("\n--- After ---\n")
    if after_contents is None:
        outf.write("(file removed)\n")
    else:
        outf.write(after_contents)
        if not after_contents.endswith("\n"):
            outf.write("\n")

    outf.write("\n--- Diff ---\n")
    diff_output = generate_file_diff(commit_sha, file_path, parent_sha)
    outf.write(diff_output if diff_output else "(no differences)\n")
    if not diff_output.endswith("\n"):
        outf.write("\n")
    outf.write("\n")


def run_commit_big_picture(
    commit_info: Dict[str, str],
    files: List[str],
    checks: List[Dict[str, str]],
    output_file: str,
    include_logs: bool = False,
) -> bool:
    """Generate a commit report with diffs and metadata."""
    print(f"Creating diff compilation for commit {commit_info['short']}...")

    if not files:
        print(f"Warning: No files found for commit {commit_info['short']}")
        return False

    parent_sha = get_commit_parent(commit_info["sha"])

    summary_text = " ".join(commit_info.get("body", "").split()) or "(no summary provided)"

    with open(output_file, "w", encoding="utf-8") as diff_file:
        diff_file.write(f"# Commit: {commit_info['sha']}\n")
        diff_file.write(f"# Short: {commit_info['short']}\n")
        diff_file.write(f"# Title: {commit_info['title']}\n")
        diff_file.write(f"# Author: {commit_info.get('author', 'unknown')}\n")
        diff_file.write(f"# Author email: {commit_info.get('authorEmail', '')}\n")
        diff_file.write(f"# Date: {commit_info.get('date', '')}\n")
        diff_file.write(f"# URL: {commit_info.get('url', '')}\n")
        diff_file.write(f"# Summary: {summary_text}\n")
        diff_file.write(f"# Changed files: {len(files)}\n")
        diff_file.write(f"# Files: {', '.join(files)}\n\n")
        diff_file.write("=" * 80 + "\n")

        for file_path in files:
            write_file_section(diff_file, file_path, commit_info["sha"], parent_sha)

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

                summary = check.get("summary") or check.get("title") or ""
                if summary:
                    for line in summary.splitlines():
                        diff_file.write(f"    {line}\n")
                if include_logs and log_output:
                    diff_file.write("    Logs:\n")
                    for line in log_output.splitlines():
                        diff_file.write(f"    {line}\n")

        diff_file.write("\n")

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
    """Create a master comparison file combining all individual commit files."""
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
                f"# Commit {idx}/{len(commit_files)} - "
                f"{commit_info['short']}: {commit_info['title']}\n"
            )
            outf.write("=" * 80 + "\n\n")

            with open(commit_file, "r", encoding="utf-8") as inf:
                outf.write(inf.read())

            outf.write("\n\n")

    print(f"✓ Created master comparison: {output_file}")
    return True


def create_touched_files_compilation(
    commit_entries: List[Tuple[Dict[str, str], List[str]]],
    selection_requested: str,
    selection_canonical: str,
    selected_commits: List[str],
    output_file: str,
    include_logs: bool = False,
) -> bool:
    """Create a compilation of touched files per commit."""
    print("Creating touched files compilation...")

    if not commit_entries:
        print("Warning: No touched files available for compilation")
        return False

    with open(output_file, "w", encoding="utf-8") as outf:
        log_note = " (with logs)" if include_logs else ""
        outf.write(f"# Touched Files{log_note} (commits)\n")
        for line in selection_header_lines(
            selection_requested, selection_canonical, selected_commits
        ):
            outf.write(f"{line}\n")
        outf.write(f"# Total commits: {len(commit_entries)}\n")
        outf.write(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        outf.write("=" * 80 + "\n\n")

        for idx, (commit_info, files) in enumerate(commit_entries, 1):
            parent_sha = get_commit_parent(commit_info["sha"])
            outf.write("=" * 80 + "\n")
            outf.write(
                f"# Commit {idx}/{len(commit_entries)} - "
                f"{commit_info['short']}: {commit_info['title']}\n"
            )
            outf.write(f"# Commit: {commit_info['sha']}\n")
            outf.write(f"# Date: {commit_info.get('date', '')}\n")
            outf.write(f"# URL: {commit_info.get('url', '')}\n")
            outf.write(f"# Files: {', '.join(files)}\n\n")

            for file_path in files:
                write_file_section(outf, file_path, commit_info["sha"], parent_sha)

            outf.write("\n")

    print(f"✓ Created touched files compilation: {output_file}")
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
                f"## Commit {idx}/{len(commit_files)} - "
                f"{commit_info['short']}: {commit_info['title']}\n"
            )
            outf.write(f"- Author: {commit_info.get('author', 'unknown')}\n")
            outf.write(f"- Date: {commit_info.get('date', '')}\n")
            outf.write(f"- URL: {commit_info.get('url', '')}\n")
            outf.write(f"- Summary: {summary_text}\n")
            outf.write(f"- Detailed file: {commit_file}\n")
            outf.write("\n")

    print(f"✓ Created summary compilation: {output_file}")
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
            "Commit selection string like 'abc1234,def5678-9999999'. "
            "Accepts commas, ranges, and whitespace."
        ),
    )
    parser.add_argument(
        "--commits",
        dest="commit_selection",
        help=(
            "Alias for the commit selection string. "
            "Examples: 'abc1234,def5678-9999999'."
        ),
    )
    parser.add_argument(
        "--output-dir",
        default="/tmp",
        help="Directory where output files will be written (default: /tmp)",
    )
    parser.add_argument(
        "--no-cleanup",
        action="store_true",
        help="Don't return to the original branch at the end",
    )

    args = parser.parse_args()

    if not args.commit_selection:
        parser.error("commit_selection is required (e.g. 'abc1234,def5678-9999999').")

    try:
        selected_commits = parse_commit_selection(args.commit_selection)
    except SelectionParseError as exc:
        parser.error(str(exc))

    selection_requested = args.commit_selection
    selection_canonical = format_commit_selection(selected_commits)
    selection_tag = build_selection_tag(selected_commits, selection_canonical)

    print(f"Requested commit selection: {selection_requested}")
    print(f"Canonical commit selection: {selection_canonical}")
    if selected_commits:
        preview = format_commit_list_preview(selected_commits)
        print(
            f"Expanded commits: count={len(selected_commits)} "
            f"min={selected_commits[0][:7]} max={selected_commits[-1][:7]} preview={preview}"
        )

    starting_branch = run_command("git branch --show-current")

    try:
        repo = get_repo_name_with_owner()

        print(f"Collecting info for commit selection: {selection_canonical}...")
        commit_infos: List[Dict[str, str]] = []
        missing_commits: List[str] = []

        for commit_sha in selected_commits:
            try:
                commit_info = get_commit_info(commit_sha, repo)
                commit_infos.append(commit_info)
                print(f"  Commit {commit_info['short']}: {commit_info['title']}")
            except (subprocess.CalledProcessError, json.JSONDecodeError, KeyError) as exc:
                print(f"  Commit {commit_sha[:7]}: Not found or inaccessible ({exc})")
                missing_commits.append(commit_sha)

        if not commit_infos:
            print("Error: No valid commits found for the requested selection")
            sys.exit(1)

        successful_commits: List[Tuple[Dict[str, str], str]] = []
        successful_commits_with_logs: List[Tuple[Dict[str, str], str]] = []
        touched_entries: List[Tuple[Dict[str, str], List[str]]] = []

        for commit_info in commit_infos:
            print(f"\n--- Processing commit {commit_info['short']}: {commit_info['title']} ---")

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

            touched_entries.append((commit_info, included_files))

            try:
                checks_with_logs: List[Dict[str, str]] = []
                checks = get_commit_checks(commit_info["sha"], repo)
            except (subprocess.CalledProcessError, json.JSONDecodeError, KeyError) as exc:
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
                args.output_dir, f"commit-{commit_info['short']}-implementation.txt"
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
            skipped_commits = [sha for sha in selected_commits if sha not in processed_shas]
            print(
                f"\nRequested commit count: {requested_count}; "
                f"processed commit count: {processed_count}"
            )
            if missing_commits:
                print(
                    "Missing/inaccessible commits: "
                    + ", ".join(sha[:7] for sha in missing_commits)
                )
            if skipped_commits:
                print(
                    "Skipped commits after processing: "
                    + ", ".join(sha[:7] for sha in skipped_commits)
                )

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
                touched_entries,
                selection_requested,
                selection_canonical,
                selected_commits,
                touched_output,
            )

            print(
                f"\n✓ Successfully processed {len(successful_commits)} commit(s) (without logs)"
            )
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
                touched_entries,
                selection_requested,
                selection_canonical,
                selected_commits,
                touched_output_with_logs,
                include_logs=True,
            )

            print(
                f"\n✓ Successfully processed {len(successful_commits_with_logs)} commit(s) (with logs)"
            )
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
        if not args.no_cleanup and starting_branch:
            try:
                run_command(f"git checkout {shlex.quote(starting_branch)}")
                print(f"✓ Returned to {starting_branch} branch")
            except subprocess.CalledProcessError:
                print(f"Warning: Failed to return to {starting_branch} branch")


if __name__ == "__main__":
    main()
