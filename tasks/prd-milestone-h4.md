# PRD: Milestone H4 — Mirror Worker Pushes to GitHub

## Introduction

Milestone H4 extends the mirror worker to push commits to a GitHub repository. This enables the context repo to be shared and synchronized via GitHub, making events accessible to any tooling that can read a git repo.

**Definition of Done:** Events show up in a real GitHub repo within 10–30 seconds.

## Goals

- Push commits to GitHub after each batch commit
- Configure GitHub via environment variables (PAT, repo URL, branch)
- Handle conflicts via pull + rebase before push
- Enforce single-writer semantics via lock file
- Never modify or delete existing event files (append-only safety)

## User Stories

### US-001: Add GitHub configuration env vars
**Description:** As a developer, I want to configure GitHub push via environment variables.

**Acceptance Criteria:**
- [ ] `GITHUB_PAT` env var for Personal Access Token (required for push)
- [ ] `GITHUB_REPO_URL` env var for remote repository URL (required for push)
- [ ] `GITHUB_BRANCH` env var for target branch (optional, default: `main`)
- [ ] Push is skipped if GITHUB_PAT or GITHUB_REPO_URL not set (local-only mode)
- [ ] Config logged at startup (PAT redacted)
- [ ] Typecheck passes

### US-002: Configure git remote from env var
**Description:** As a developer, I want the mirror to configure the git remote automatically.

**Acceptance Criteria:**
- [ ] On startup, check if `origin` remote exists
- [ ] If not exists, run `git remote add origin {GITHUB_REPO_URL}`
- [ ] If exists but URL differs, run `git remote set-url origin {GITHUB_REPO_URL}`
- [ ] URL includes PAT for HTTPS auth: `https://{PAT}@github.com/owner/repo.git`
- [ ] Typecheck passes

### US-003: Push after batch commit
**Description:** As a developer, I want commits pushed to GitHub after each batch.

**Acceptance Criteria:**
- [ ] After successful `git commit`, run `git push origin {branch}`
- [ ] Log success: "Pushed {n} event(s) to GitHub"
- [ ] If push fails, log error but don't crash (retry on next batch)
- [ ] Typecheck passes

### US-004: Pull and rebase before push
**Description:** As a developer, I want the mirror to pull and rebase before pushing to handle conflicts.

**Acceptance Criteria:**
- [ ] Before push, run `git fetch origin {branch}`
- [ ] Run `git rebase origin/{branch}` if local is behind
- [ ] If rebase succeeds, proceed with push
- [ ] If rebase fails, abort rebase and log error
- [ ] Typecheck passes

### US-005: Append-only safety check
**Description:** As a developer, I want the mirror to fail if rebase would modify existing event files.

**Acceptance Criteria:**
- [ ] Before rebase, check for pending changes that modify/delete files in events/
- [ ] After rebase, verify no existing event files were modified or deleted
- [ ] If violation detected, abort with clear error message
- [ ] Only allow adding new files under events/
- [ ] Typecheck passes

### US-006: Single-writer lock file
**Description:** As a developer, I want a lock file to prevent multiple mirrors from thrashing.

**Acceptance Criteria:**
- [ ] On startup, create/update `.crp/lock.json` with instance ID and timestamp
- [ ] Lock file contains: `{ instance_id, started_at, last_heartbeat }`
- [ ] Update `last_heartbeat` periodically (e.g., every 30s)
- [ ] On startup, warn if lock exists with recent heartbeat (< 60s)
- [ ] Lock is best-effort (advisory, not enforced)
- [ ] Typecheck passes

### US-007: Commit lock file changes
**Description:** As a developer, I want lock file updates included in commits.

**Acceptance Criteria:**
- [ ] Lock file is staged with `git add .crp/lock.json` before commit
- [ ] Lock file changes are pushed with event commits
- [ ] Typecheck passes

### US-008: Integration test for GitHub push
**Description:** As a developer, I want a test that validates the GitHub push flow.

**Acceptance Criteria:**
- [ ] Test configures PAT and repo URL (can use test repo or mock)
- [ ] Test posts event to relay
- [ ] Test verifies commit was pushed to remote
- [ ] Test verifies event file exists in remote repo
- [ ] Test passes
- [ ] Typecheck passes

## Functional Requirements

- FR-1: GitHub push requires `GITHUB_PAT` and `GITHUB_REPO_URL` env vars
- FR-2: `GITHUB_BRANCH` defaults to `main` if not set
- FR-3: Remote is configured automatically from `GITHUB_REPO_URL`
- FR-4: Push occurs after each successful batch commit
- FR-5: Before push, fetch and rebase to handle remote changes
- FR-6: If rebase would modify/delete existing event files, abort with error
- FR-7: Lock file at `.crp/lock.json` tracks active mirror instance
- FR-8: If GitHub env vars not set, mirror runs in local-only mode (no push)

## Non-Goals

- No GitHub App authentication (PAT only in H4)
- No automatic repo creation via GitHub API
- No force push
- No multi-branch support (single branch per mirror)
- No pull request workflow
- No webhook triggers

## Technical Considerations

### URL Format with PAT
```
https://{GITHUB_PAT}@github.com/owner/repo.git
```

### Lock File Format
```json
{
  "instance_id": "uuid",
  "started_at": "2026-01-10T12:00:00.000Z",
  "last_heartbeat": "2026-01-10T12:05:00.000Z"
}
```

### Append-Only Check
Before rebase:
```bash
git diff --name-status origin/{branch}..HEAD
```
Verify all changes are `A` (added), not `M` (modified) or `D` (deleted) for `events/**`.

### Rebase Failure Recovery
```bash
git rebase --abort
```
Log error and skip push for this batch. Next batch will retry.

## Success Metrics

- Event appears in GitHub repo within 10–30 seconds of POST
- Duplicate mirror instances produce warning in logs
- Rebase conflicts on non-event files are handled gracefully
- Attempted modification of existing event files fails loudly

## Open Questions

- Should we add retry logic with backoff for push failures?
- Should lock file include feed IDs being mirrored?
- Should we support SSH keys in a future milestone?
