#!/usr/bin/env python3
"""
commit_batch_big_picture - Automate diff/log generation for ranges of commits.

This tool creates diff summaries, touched file snapshots, and check/log
summaries for selected commits.
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


def resolve_commit(ref: str) -> str:
    """Resolve a commit-ish ref to a full SHA."""
    cleaned = ref.strip()
    if not cleaned:
        raise SelectionParseError("Invalid commit selection: empty token.")
    try:
        return run_command(f"git rev-parse --verify {shlex.quote(cleaned)}^{{commit}}")
    except subprocess.CalledProcessError as exc:
        raise SelectionParseError(f"Invalid commit selection token '{ref}'.") from exc


def ensure_ancestor(start_sha: str, end_sha: str, segment: str) -> None:
    """Ensure start_sha is an ancestor of end_sha."""
    try:
        run_command(
            f"git merge-base --is-ancestor {shlex.quote(start_sha)} {shlex.quote(end_sha)}",
            check=True,
            capture_output=False,
        )
    except subprocess.CalledProcessError as exc:
        raise SelectionParseError(
            f"Invalid commit range '{segment}': start must be an ancestor of end."
        ) from exc


def parse_commit_selection(selection: str) -> List[str]:
    """Parse a selection string into an ordered list of unique commit SHAs."""
    original = selection
    trimmed = selection.strip()
    if not trimmed:
        raise SelectionParseError(
            "Invalid commit selection: empty input. "
            "Expected format like 'a1b2c3d,deadbeef' or 'a1b2c3d-deadbeef'."
        )

    segments = [segment.strip() for segment in trimmed.split(",")]
    if any(segment == "" for segment in segments):
        raise SelectionParseError(
            f"Invalid commit selection segment '' in '{original}'. "
            "Expected format like 'a1b2c3d,deadbeef' or 'a1b2c3d-deadbeef'."
        )

    ordered: List[str] = []
    seen: Set[str] = set()

    for segment in segments:
        cleaned = re.sub(r"\s+", "", segment)
        if not cleaned:
            raise SelectionParseError(
                f"Invalid commit selection segment '{segment}' in '{original}'. "
                "Expected format like 'a1b2c3d,deadbeef' or 'a1b2c3d-deadbeef'."
            )

        parts = cleaned.split("-")
        if len(parts) == 1:
            sha = resolve_commit(parts[0])
            if sha not in seen:
                ordered.append(sha)
                seen.add(sha)
        elif len(parts) == 2:
            start_sha = resolve_commit(parts[0])
            end_sha = resolve_commit(parts[1])
            ensure_ancestor(start_sha, end_sha, segment)
            rev_list = run_command(
                f"git rev-list --reverse {shlex.quote(start_sha)}^..{shlex.quote(end_sha)}"
            )
            if not rev_list:
                raise SelectionParseError(
                    f"Invalid commit range '{segment}': no commits found."
                )
            for sha in rev_list.splitlines():
                if sha not in seen:
                    ordered.append(sha)
                    seen.add(sha)
        else:
            raise SelectionParseError(
                f"Invalid commit selection segment '{segment}' in '{original}'. "
                "Expected format like 'a1b2c3d,deadbeef' or 'a1b2c3d-deadbeef'."
            )

    if not ordered:
        raise SelectionParseError(
            f"Invalid commit selection '{original}': no commits parsed."
        )

    return ordered


def format_commit_selection(commits: List[str]) -> str:
    """Format a list of commits into a canonical selection string."""
    return ",".join(commit[:12] for commit in commits)


def build_selection_tag(selected_commits: List[str], selection_canonical: str) -> str:
    selection_hash = hashlib.sha1(selection_canonical.encode("utf-8")).hexdigest()[:8]
    if not selected_commits:
        return f"0commits-{selection_hash}"
    first = selected_commits[0][:7]
    last = selected_commits[-1][:7]
    return f"{first}-{last}-{len(selected_commits)}commits-{selection_hash}"


def format_commit_list_preview(commits: List[str], max_items: int = 20, edge_items: int = 5) -> str:
    if len(commits) <= max_items:
        return ", ".join(commit[:12] for commit in commits)
    head = ", ".join(commit[:12] for commit in commits[:edge_items])
    tail = ", ".join(commit[:12] for commit in commits[-edge_items:])
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
            expanded = ", ".join(commit[:12] for commit in selected_commits)
            lines.append(
                f"# Expanded commits (count={len(selected_commits)}): {expanded}"
            )
        else:
            preview = format_commit_list_preview(selected_commits)
            lines.append(
                f"# Expanded commits: count={len(selected_commits)} "
                f"min={selected_commits[0][:12]} max={selected_commits[-1][:12]} preview={preview}"
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


def get_repo_slug() -> str | None:
    """Return the GitHub repo slug (owner/name) if available."""
    try:
        remote = run_command("git config --get remote.origin.url")
    except subprocess.CalledProcessError:
        return None

    if remote.startswith("git@github.com:"):
        slug = remote.split(":", 1)[1]
    elif remote.startswith("https://github.com/"):
        slug = remote.split("https://github.com/", 1)[1]
    elif remote.startswith("ssh://git@github.com/"):
        slug = remote.split("ssh://git@github.com/", 1)[1]
    else:
        return None

    slug = slug.strip()
    if slug.endswith(".git"):
        slug = slug[:-4]

    return slug or None


def get_commit_info(sha: str, repo_slug: str | None) -> Dict[str, str]:
    """Get commit metadata for a specific commit SHA."""
    format_string = "%H%n%h%n%an%n%ae%n%ad%n%s%n%B"
    raw = run_command(
        f"git show -s --date=iso-strict --format={shlex.quote(format_string)} {shlex.quote(sha)}"
    )
    parts = raw.split("\n", 6)
    if len(parts) < 6:
        raise ValueError(f"Unexpected git show output for {sha}")
    full_sha = parts[0]
    short_sha = parts[1]
    author_name = parts[2]
    author_email = parts[3]
    author_date = parts[4]
    subject = parts[5]
    body = parts[6] if len(parts) > 6 else ""
    message = (subject + "\n" + body).strip()

    url = ""
    if repo_slug:
        url = f"https://github.com/{repo_slug}/commit/{full_sha}"

    return {
        "sha": full_sha,
        "short_sha": short_sha,
        "author": author_name,
        "author_email": author_email,
        "date": author_date,
        "subject": subject,
        "message": message,
        "url": url,
    }


def get_commit_changed_files(sha: str) -> List[str]:
    """Get list of changed files for a specific commit."""
    output = run_command(
        f"git show --name-only --pretty=format: {shlex.quote(sha)}"
    )
    files = [line.strip() for line in output.splitlines() if line.strip()]
    return files


def get_commit_parent(sha: str) -> str | None:
    """Get the first parent SHA for a commit, if any."""
    parents = run_command(f"git rev-list --parents -n 1 {shlex.quote(sha)}").split()
    if len(parents) >= 2:
        return parents[1]
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


def get_commit_checks(sha: str, repo_slug: str | None) -> List[Dict[str, str]]:
    """Get status check results for a specific commit."""
    if not repo_slug:
        return []

    try:
        checks_json = run_command(
            "gh api "
            f"/repos/{repo_slug}/commits/{sha}/check-runs "
            "-H 'Accept: application/vnd.github+json'"
        )
    except subprocess.CalledProcessError:
        return []

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


def summarize_checks(checks: List[Dict[str, str]]) -> str:
    """Return a high-level summary for checks."""
    if not checks:
        return "no checks"
    failures = [
        check
        for check in checks
        if (check.get("conclusion") or "").lower() not in {"success", "neutral", "skipped"}
    ]
    if failures:
        return f"{len(failures)} failing"
    pending = [
        check
        for check in checks
        if (check.get("status") or "").lower() not in {"completed", "success"}
    ]
    if pending:
        return f"{len(pending)} pending"
    return "all green"


def run_commit_big_picture(
    commit_info: Dict[str, str],
    files: List[str],
    checks: List[Dict[str, str]],
    output_file: str,
    include_logs: bool = False,
) -> bool:
    """Generate a git diff for a commit."""
    print(f"Creating diff compilation for commit {commit_info['short_sha']}...")

    if not files:
        print(f"Warning: No files found for commit {commit_info['short_sha']}")
        return False

    files_arg = " ".join(shlex.quote(f) for f in files)
    cmd = f"git show {shlex.quote(commit_info['sha'])} -- {files_arg}"
    diff_output = run_command(cmd)

    with open(output_file, "w", encoding="utf-8") as diff_file:
        diff_file.write(
            f"# Commit {commit_info['short_sha']}: {commit_info.get('subject', '')}\n"
        )
        diff_file.write(f"# SHA: {commit_info['sha']}\n")
        diff_file.write(f"# Author: {commit_info.get('author', '')} <{commit_info.get('author_email', '')}>\n")
        diff_file.write(f"# Date: {commit_info.get('date', '')}\n")
        diff_file.write(f"# URL: {commit_info.get('url', '')}\n")
        diff_file.write(f"# Message: {commit_info.get('message', '')}\n")
        diff_file.write(f"# Changed files: {len(files)}\n")
        diff_file.write(f"# Files: {', '.join(files)}\n")
        diff_file.write("\n")
        diff_file.write("=" * 80 + "\n")
        diff_file.write(diff_output if diff_output else "# No differences found\n")
        diff_file.write("\n\n")
        diff_file.write("=" * 80 + "\n")
        diff_file.write(f"Checks ({len(checks)}): {summarize_checks(checks)}\n")

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


def create_commit_touched_files(
    commit_info: Dict[str, str],
    files: List[str],
    output_file: str,
) -> bool:
    """Create a touched files compilation for a commit."""
    print(f"Creating touched files compilation for commit {commit_info['short_sha']}...")

    if not files:
        print(f"Warning: No touched files found for commit {commit_info['short_sha']}")
        return False

    parent_sha = get_commit_parent(commit_info["sha"])

    with open(output_file, "w", encoding="utf-8") as outf:
        outf.write(
            f"# Commit {commit_info['short_sha']}: touched files snapshot\n"
        )
        outf.write(f"# SHA: {commit_info['sha']}\n")
        outf.write(f"# Parent: {parent_sha or '(root commit)'}\n")
        outf.write(f"# Date: {commit_info.get('date', '')}\n")
        outf.write(f"# Author: {commit_info.get('author', '')} <{commit_info.get('author_email', '')}>\n")
        outf.write(f"# URL: {commit_info.get('url', '')}\n")
        outf.write(f"# Changed files: {len(files)}\n")
        outf.write(f"# Files: {', '.join(files)}\n")
        outf.write("=" * 80 + "\n\n")

        for file_path in files:
            outf.write("=" * 80 + "\n")
            outf.write(f"# File: {file_path}\n\n")

            before_contents = ""
            after_contents = ""

            if parent_sha:
                try:
                    before_contents = run_command(
                        f"git show {shlex.quote(parent_sha)}:{shlex.quote(file_path)}"
                    )
                except subprocess.CalledProcessError:
                    before_contents = "# File did not exist before this commit\n"
            else:
                before_contents = "# File did not exist before this commit (root commit)\n"

            try:
                after_contents = run_command(
                    f"git show {shlex.quote(commit_info['sha'])}:{shlex.quote(file_path)}"
                )
            except subprocess.CalledProcessError:
                after_contents = "# File was deleted in this commit\n"

            diff_output = run_command(
                f"git show {shlex.quote(commit_info['sha'])} -- {shlex.quote(file_path)}"
            )

            outf.write("## Before\n")
            outf.write(before_contents)
            if not before_contents.endswith("\n"):
                outf.write("\n")
            outf.write("\n## After\n")
            outf.write(after_contents)
            if not after_contents.endswith("\n"):
                outf.write("\n")
            outf.write("\n## Diff\n")
            outf.write(diff_output if diff_output else "# No diff available\n")
            if not diff_output.endswith("\n"):
                outf.write("\n")
            outf.write("\n")

    print(f"✓ Created touched files compilation: {output_file}")
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
                f"# Commit {idx}/{len(commit_files)} - {commit_info['short_sha']}: "
                f"{commit_info.get('subject', '')}\n"
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
            message = " ".join(commit_info.get("message", "").split())

            outf.write(
                f"## Commit {idx}/{len(commit_files)} - {commit_info['short_sha']}: "
                f"{commit_info.get('subject', '')}\n"
            )
            outf.write(f"- Author: {commit_info.get('author', '')}\n")
            outf.write(f"- Date: {commit_info.get('date', '')}\n")
            outf.write(f"- URL: {commit_info.get('url', '')}\n")
            outf.write(f"- Message: {message}\n")
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
            "Commit selection string like 'a1b2c3d,deadbeef' or 'a1b2c3d-deadbeef'. "
            "Accepts commas, ranges, whitespace."
        ),
    )
    parser.add_argument(
        "--commits",
        dest="commit_selection",
        help=(
            "Alias for the commit selection string. "
            "Examples: 'a1b2c3d,deadbeef' or 'a1b2c3d-deadbeef'."
        ),
    )
    parser.add_argument(
        "--base-branch",
        default="main",
        help="Base branch to start from (default: main)",
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
        parser.error("commit_selection is required (e.g. 'a1b2c3d,deadbeef').")

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
            f"min={selected_commits[0][:12]} max={selected_commits[-1][:12]} preview={preview}"
        )

    check_current_branch(args.base_branch)

    repo_slug = get_repo_slug()
    if repo_slug:
        print(f"Using GitHub repo slug: {repo_slug}")
    else:
        print("Warning: Could not determine GitHub repo slug; checks will be skipped.")

    try:
        successful_commits: List[Tuple[Dict[str, str], str]] = []
        successful_commits_with_logs: List[Tuple[Dict[str, str], str]] = []

        for sha in selected_commits:
            commit_info = get_commit_info(sha, repo_slug)
            print(
                f"\n--- Processing commit {commit_info['short_sha']}: "
                f"{commit_info.get('subject', '')} ---"
            )

            try:
                all_files = get_commit_changed_files(commit_info["sha"])
            except subprocess.CalledProcessError as exc:
                print(f"Failed to retrieve files for commit {commit_info['short_sha']}: {exc}")
                continue

            if not all_files:
                print(f"No changed files found for commit {commit_info['short_sha']}")
                continue

            print(f"Total changed files: {len(all_files)}")
            included_files, _excluded_files = filter_excluded_files(all_files)
            if not included_files:
                print(
                    f"No files to process for commit {commit_info['short_sha']} "
                    "(all files were excluded)"
                )
                continue

            print(
                f"Files to process ({len(included_files)}): {', '.join(included_files)}"
            )

            checks: List[Dict[str, str]] = []
            checks_with_logs: List[Dict[str, str]] = []
            if repo_slug:
                try:
                    checks = get_commit_checks(commit_info["sha"], repo_slug)
                except (subprocess.CalledProcessError, json.JSONDecodeError, KeyError) as exc:
                    print(f"Failed to retrieve checks for commit {commit_info['short_sha']}: {exc}")
                    checks = []
                else:
                    for check in checks:
                        check_copy = dict(check)
                        logs = get_failed_check_logs(check_copy)
                        if logs:
                            check_copy["logOutput"] = logs
                        checks_with_logs.append(check_copy)

            output_file = os.path.join(
                args.output_dir, f"commit-{commit_info['short_sha']}-implementation.txt"
            )
            output_file_with_logs = os.path.join(
                args.output_dir,
                f"commit-{commit_info['short_sha']}-implementation-with-logs.txt",
            )
            touched_file_output = os.path.join(
                args.output_dir,
                f"commit-{commit_info['short_sha']}-touched-files.txt",
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

            create_commit_touched_files(commit_info, included_files, touched_file_output)

        if successful_commits:
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

            print(f"\n✓ Successfully processed {len(successful_commits)} commit(s) (without logs)")
            print(f"✓ Individual files: {args.output_dir}/commit-{{sha}}-implementation.txt")
            print(f"✓ Master comparison: {master_output}")
            print(f"✓ Summary compilation: {summary_output}")
            print(
                f"✓ Touched files: {args.output_dir}/commit-{{sha}}-touched-files.txt"
            )
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

            print(f"\n✓ Successfully processed {len(successful_commits_with_logs)} commit(s) (with logs)")
            print(
                f"✓ Individual files (with logs): {args.output_dir}/commit-{{sha}}-implementation-with-logs.txt"
            )
            print(f"✓ Master comparison (with logs): {master_output_with_logs}")
            print(f"✓ Summary compilation (with logs): {summary_output_with_logs}")
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
