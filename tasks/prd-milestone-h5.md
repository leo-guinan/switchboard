# PRD: Milestone H5 — CI Append-Only Guard

## Introduction

Milestone H5 implements a CI workflow that enforces the append-only invariant for context repos. Any PR or push that modifies or deletes files under `events/` will fail CI. This guard is the enforcement mechanism for the core coordination principle: events are immutable.

**Definition of Done:** PR that edits an event file fails CI.

## The Canonical Rule

> **Files under `events/` are immutable. Any modification or deletion fails CI. Corrections must be expressed as new events.**

This rule is the backbone of:
- Append-only context
- Agent auditability  
- Replayable coordination history

## Goals

- Fail CI on any modification or deletion of files under `events/`
- Provide a reusable workflow template for context repos
- Create a test context repo with sample PR to validate the guard
- Document the immutability rule prominently

## User Stories

### US-001: Create append-only check script
**Description:** As a developer, I need a script that detects modifications to event files.

**Acceptance Criteria:**
- [ ] `scripts/check-append-only.sh` exists
- [ ] Script takes base ref as argument (e.g., `origin/main`)
- [ ] Uses `git diff --name-status` to list changed files
- [ ] Checks for M (modified) or D (deleted) status on files under `events/`
- [ ] Exits 0 if all event changes are A (added)
- [ ] Exits 1 with clear error message if any M or D found
- [ ] Lists offending files in error output
- [ ] Typecheck passes

### US-002: Create GitHub Actions workflow template
**Description:** As a developer, I need a workflow template that context repos can copy.

**Acceptance Criteria:**
- [ ] `docs/crp/workflows/append-only-guard.yml` exists
- [ ] Workflow triggers on pull_request and push to main
- [ ] Runs on ubuntu-latest
- [ ] Checks out repo with full history (fetch-depth: 0)
- [ ] Runs append-only check script against base ref
- [ ] Workflow has clear name: "Append-Only Guard"
- [ ] Typecheck passes

### US-003: Document workflow setup in CRP spec
**Description:** As a developer, I need documentation on how to enable the guard.

**Acceptance Criteria:**
- [ ] `docs/crp/crp-v0.1.md` updated with CI Guard section
- [ ] Documents the canonical immutability rule in bold
- [ ] Explains why events are immutable (auditability, replayability)
- [ ] Provides step-by-step instructions to copy workflow to `.github/workflows/`
- [ ] Typecheck passes

### US-004: Update crp_init to include workflow
**Description:** As a developer, I want crp_init to optionally include the CI workflow.

**Acceptance Criteria:**
- [ ] `scripts/crp_init.ts` accepts `--ci` flag
- [ ] When `--ci` passed, creates `.github/workflows/` directory
- [ ] Copies append-only-guard.yml to `.github/workflows/append-only-guard.yml`
- [ ] Without `--ci`, does not create workflow
- [ ] Typecheck passes

### US-005: Create test context repo
**Description:** As a developer, I need a test repo to validate the guard works.

**Acceptance Criteria:**
- [ ] Create new GitHub repo for testing (e.g., `switchboard-context-test`)
- [ ] Initialize with crp_init --git --ci
- [ ] Push initial commit with workflow enabled
- [ ] Verify Actions tab shows workflow
- [ ] Typecheck passes

### US-006: Create passing test PR (add event)
**Description:** As a developer, I need a PR that adds an event to verify it passes CI.

**Acceptance Criteria:**
- [ ] Create branch `test/add-event`
- [ ] Add new event file under `events/test-feed/2026-01-10/test-event.json`
- [ ] Open PR against main
- [ ] Verify CI passes (green check)
- [ ] Document result in PR description
- [ ] Typecheck passes

### US-007: Create failing test PR (modify event)
**Description:** As a developer, I need a PR that modifies an event to verify it fails CI.

**Acceptance Criteria:**
- [ ] Merge the add-event PR first
- [ ] Create branch `test/modify-event`
- [ ] Modify the existing event file (change any field)
- [ ] Open PR against main
- [ ] Verify CI fails (red X)
- [ ] Error message clearly states which file was modified
- [ ] Document result in PR description
- [ ] Typecheck passes

### US-008: Create failing test PR (delete event)
**Description:** As a developer, I need a PR that deletes an event to verify it fails CI.

**Acceptance Criteria:**
- [ ] Create branch `test/delete-event` from main (after add-event merged)
- [ ] Delete the existing event file
- [ ] Open PR against main
- [ ] Verify CI fails (red X)
- [ ] Error message clearly states which file was deleted
- [ ] Document result in PR description
- [ ] Typecheck passes

## Functional Requirements

- FR-1: `check-append-only.sh` must detect modified (M) files under `events/`
- FR-2: `check-append-only.sh` must detect deleted (D) files under `events/`
- FR-3: `check-append-only.sh` must allow added (A) files under `events/`
- FR-4: `check-append-only.sh` must allow any changes outside `events/`
- FR-5: GitHub Actions workflow must run on PRs and pushes to main
- FR-6: Workflow must fail with non-zero exit code on violation
- FR-7: Error messages must list specific files that violated the rule

## Non-Goals

- No branch protection rules (manual setup by repo owner)
- No enforcement on direct pushes without CI (GitHub limitation)
- No retroactive validation of existing commits
- No automatic correction or event generation

## Technical Considerations

### Git Diff Command
```bash
git diff --name-status $BASE_REF..HEAD
```

Output format:
```
A       events/feed1/2026-01-10/event1.json    # Added - OK
M       events/feed1/2026-01-10/event2.json    # Modified - FAIL
D       events/feed1/2026-01-10/event3.json    # Deleted - FAIL
A       .crp/lock.json                          # Added outside events/ - OK
M       policy/policy.json                      # Modified outside events/ - OK
```

### Workflow Template
```yaml
name: Append-Only Guard

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Check append-only invariant
        run: ./scripts/check-append-only.sh origin/main
```

### Error Output Example
```
❌ Append-only violation detected!

The following event files were modified or deleted:
  M  events/feed-abc/2026-01-10/evt-123.json
  D  events/feed-abc/2026-01-09/evt-456.json

Files under events/ are immutable.
Corrections must be expressed as new events.
```

## Success Metrics

- PR adding event file → CI passes
- PR modifying event file → CI fails with clear message
- PR deleting event file → CI fails with clear message
- Guard is copy-paste installable in any context repo

## Open Questions

- Should we add a bypass for repo admins? (Probably not for H5)
- Should we validate JSON schema of new events in CI? (Future milestone)
- Should we add workflow to Switchboard monorepo as well? (Not needed, events/ doesn't exist there)
