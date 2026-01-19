# Memo: Creating GitHub Issues from the Command Line (Graphdown + `gh`)

## Scope

This memo documents the standard workflow for creating GitHub issues via the GitHub CLI (`gh`) for:

* Repo: **`johnbenac/graphdown`**
* Account: **`johnbenac`**
* Environment: a machine where `gh` is installed and already authenticated

It's intended to be generic so we can use it repeatedly for many future issues.

---

## Golden path workflow

### 1) Work from a clean repo context

Go to the repo root so commands that infer context do the right thing:

```bash
cd /home/johnb/Downloads/tmp/graphdown
```

(Optional but recommended) confirm you're at the repo root:

```bash
git rev-parse --show-toplevel
```

### 2) Confirm `gh` auth and confirm the repo target

Verify `gh` is authenticated:

```bash
gh auth status
```

Confirm the current directory points to the intended GitHub repo:

```bash
gh repo view --json nameWithOwner -q .nameWithOwner
```

Expected output should be:

* `johnbenac/graphdown`

**Best practice:** if you ever work across multiple repos, set the default explicitly:

```bash
gh repo set-default johnbenac/graphdown
```

Or, for safety, always pass `--repo johnbenac/graphdown` to commands.

---

## 3) Check for duplicates before creating a new issue

Run a search with a few keywords (module name + core terms + a likely error string).

Examples:

```bash
gh issue list --state all --search "keyword1 keyword2 keyword3"
```

A slightly more targeted version:

```bash
gh issue list --state all --search "in:title keyword"
```

If something already exists and matches, **don't create a new issue**—comment on or update the existing one instead.

---

## 4) Draft the issue content (recommended: body file)

### Why use a body file?

* It keeps the issue readable and structured.
* It avoids shell quoting pain.
* You can reuse the same template for many issues.

Create a temporary markdown file:

```bash
cat > /tmp/issue.md <<'EOF'
## Summary
One-paragraph description of the problem / debt / idea.

## Context
Why it matters, who hits it, and what triggers it.

## Where this lives
- Production code: `path/to/file.ts`
- Tests: `path/to/__tests__/...`

## Current behavior
What happens today.

## Expected behavior / goal
What we want (or what "good" looks like).

## Options (if decision is deferred)
- Option A: …
- Option B: …
- Option C: …

## Done criteria
- [ ] Concrete, testable checkboxes that define "done"
- [ ] …

## Notes / risks
Anything that could bite us later.
EOF
```

### Keep it Graphdown-native

Graphdown already uses consistent naming conventions and subsystem prefixes (see `docs/spec/trace-owners.md`). When drafting:

* Prefer a **clear subsystem prefix** in the title (examples: `io-github:`, `io-zip:`, `core:`, `runtime:`, `web:`).
* When relevant, include pointers to:

  * `SPEC.md` sections
  * docs under `docs/`
  * specific files under `packages/*` or `apps/web/*`

This makes issues easier to triage and keeps future work grounded.

---

## 5) Create the issue

### Minimal (title + body file)

```bash
gh issue create \
  --title "subsystem: short descriptive title" \
  --body-file /tmp/issue.md
```

### Safer (pin to repo explicitly)

```bash
gh issue create \
  --repo johnbenac/graphdown \
  --title "subsystem: short descriptive title" \
  --body-file /tmp/issue.md
```

---

## 6) Add metadata (labels / assignees / milestones) only if useful

### Check available labels first

Labels are repo-specific; don't guess. List them:

```bash
gh label list
```

### Create with labels/assignee (optional)

```bash
gh issue create \
  --title "subsystem: short descriptive title" \
  --body-file /tmp/issue.md \
  --label "tech-debt" \
  --assignee "johnbenac"
```

If labels don't exist, don't force it—create the issue cleanly first, then decide later.

---

## 7) Verify the created issue and capture the URL

After creation, `gh` prints the URL. You can also confirm with:

```bash
gh issue list --limit 5
```

Or view the issue directly:

```bash
gh issue view <number> --web
```

For logging in a commit/PR description, paste the issue URL or `#<number>`.

---

# Common patterns you'll use often

## Pattern A: Quick one-liner issue (tiny issues only)

Good for trivial notes.

```bash
gh issue create \
  --title "subsystem: short title" \
  --body "One paragraph. Include links/paths if relevant."
```

## Pattern B: Use your editor

If you prefer an editor over a temp file:

```bash
gh issue create --title "subsystem: short title" --editor
```

## Pattern C: Use an issue template (if the repo has templates)

If the repo has `.github/ISSUE_TEMPLATE`, you may be able to do:

```bash
gh issue create --template "template-name.yml"
```

If you're unsure, list templates by checking the repo filesystem:

```bash
ls -la .github/ISSUE_TEMPLATE
```

---

# Updating an issue after creation

Useful commands for follow-ups:

### Edit title/body

```bash
gh issue edit <number> --title "new title"
gh issue edit <number> --body-file /tmp/updated.md
```

### Add labels

```bash
gh issue edit <number> --add-label "tech-debt"
```

### Comment with extra context

```bash
gh issue comment <number> --body "Adding more detail: ..."
```

---

# Hygiene rules (important)

* **Always check duplicates first.**
* **Avoid secrets in issue bodies.**
  Don't paste tokens, credentials, private URLs, or local filesystem paths that shouldn't be public.
* Prefer **repo-relative file paths** (`packages/io-github/src/...`) instead of absolute machine paths.
* Write "Done criteria" as checkboxes so future you can close the loop confidently.
* Create issues **one at a time** and capture the URL immediately (in chat, commit message, or a tracking note).
