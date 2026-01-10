# PRD: Milestone H3 — Mirror Worker Writes to Local Git Repo

## Introduction

Milestone H3 implements the mirror worker that subscribes to relay SSE streams and writes events to a local git repository following the CRP structure. This milestone focuses on local git operations only—no GitHub integration yet—making debugging straightforward before tackling remote auth.

**Definition of Done:** Mirror subscribes to SSE and writes commits locally in a repo.

## Goals

- Subscribe to multiple feeds via SSE
- Write events to local git repo following CRP structure
- Commit changes with configurable batching
- Auto-reconnect on SSE disconnect
- Initialize repo if it doesn't exist

## User Stories

### US-001: Create Mirror Worker Package Scaffold
**Description:** As a developer, I need the mirror-worker package set up with basic structure.

**Acceptance Criteria:**
- [ ] `packages/mirror-worker/package.json` exists with dependencies
- [ ] `packages/mirror-worker/tsconfig.json` exists
- [ ] `packages/mirror-worker/src/index.ts` exists as entry point
- [ ] Dependencies include eventsource (or similar SSE client library)
- [ ] Typecheck passes

### US-002: Configuration via Environment Variables
**Description:** As a developer, I want to configure the mirror worker via env vars.

**Acceptance Criteria:**
- [ ] `RELAY_URL` - base URL of relay API (required)
- [ ] `FEED_IDS` - comma-separated list of feed IDs to subscribe (required)
- [ ] `CONTEXT_REPO_PATH` - local path to git repo (required)
- [ ] `COMMIT_BATCH_SIZE` - number of events before commit (default: 10)
- [ ] `COMMIT_BATCH_TIMEOUT_MS` - max time before commit (default: 5000)
- [ ] Fails with clear error if required vars missing
- [ ] Typecheck passes

### US-003: SSE Client Connection
**Description:** As a developer, I want the mirror to connect to feed SSE streams.

**Acceptance Criteria:**
- [ ] Connects to `{RELAY_URL}/feeds/{feed_id}/stream` for each feed in FEED_IDS
- [ ] Logs successful connection to stdout
- [ ] Parses incoming SSE `data:` messages as JSON events
- [ ] Typecheck passes

### US-004: SSE Auto-Reconnect with Backoff
**Description:** As a developer, I want the mirror to auto-reconnect on disconnect.

**Acceptance Criteria:**
- [ ] On SSE connection error or close, attempts reconnect
- [ ] Uses exponential backoff (1s, 2s, 4s, 8s, max 30s)
- [ ] Logs reconnection attempts to stdout
- [ ] Resets backoff on successful reconnect
- [ ] Typecheck passes

### US-005: Initialize Repo if Not Exists
**Description:** As a developer, I want the mirror to initialize the CRP repo if it doesn't exist.

**Acceptance Criteria:**
- [ ] If CONTEXT_REPO_PATH doesn't exist, creates directory
- [ ] Runs `git init` if not a git repo
- [ ] Creates CRP directory structure (events/, snapshots/, policy/, .crp/)
- [ ] Creates .crp/manifest.json with version and created_at
- [ ] Typecheck passes

### US-006: Write Event Files to CRP Structure
**Description:** As a developer, I want events written to the correct CRP path.

**Acceptance Criteria:**
- [ ] Events written to `events/{feed_id}/{YYYY-MM-DD}/{event_id}.json`
- [ ] Date extracted from event `ts` field
- [ ] Creates directories if they don't exist
- [ ] Event file contains full event JSON (pretty-printed)
- [ ] Typecheck passes

### US-007: Batch Commits with Configurable Strategy
**Description:** As a developer, I want commits batched for efficiency.

**Acceptance Criteria:**
- [ ] Commits after COMMIT_BATCH_SIZE events received
- [ ] Commits after COMMIT_BATCH_TIMEOUT_MS if pending events exist
- [ ] Commit message includes count: "Mirror: add {n} event(s)"
- [ ] Runs `git add .` then `git commit`
- [ ] Typecheck passes

### US-008: Graceful Shutdown
**Description:** As a developer, I want the mirror to commit pending events on shutdown.

**Acceptance Criteria:**
- [ ] Listens for SIGINT and SIGTERM
- [ ] On shutdown signal, commits any pending events
- [ ] Closes SSE connections gracefully
- [ ] Exits with code 0 after cleanup
- [ ] Typecheck passes

### US-009: Integration Test for Full Flow
**Description:** As a developer, I want a test that validates the complete mirror flow.

**Acceptance Criteria:**
- [ ] Test starts relay (or mocks SSE endpoint)
- [ ] Test starts mirror with CONTEXT_REPO_PATH pointing to temp directory
- [ ] Test posts 3 events to relay
- [ ] Test verifies 3 event files exist in correct CRP paths
- [ ] Test verifies `git log` shows commit(s)
- [ ] Test passes
- [ ] Typecheck passes

## Functional Requirements

- FR-1: Mirror worker runs as standalone Node.js process
- FR-2: Subscribes to SSE streams for all feeds in FEED_IDS
- FR-3: Writes events to `events/{feed_id}/{YYYY-MM-DD}/{event_id}.json`
- FR-4: Commits in batches (configurable by count and timeout)
- FR-5: Auto-reconnects on SSE disconnect with exponential backoff
- FR-6: Initializes CRP repo structure if path doesn't exist
- FR-7: Commits pending events on graceful shutdown
- FR-8: All configuration via environment variables

## Non-Goals

- No GitHub push (local git only)
- No GitHub authentication
- No pull/fetch from remote
- No conflict resolution
- No event deduplication (assumes relay handles idempotency)
- No web UI or API

## Technical Considerations

- Use `eventsource` npm package for SSE client (or native EventSource if available)
- Use `simple-git` or `child_process` for git operations
- Consider file locking if multiple feeds write concurrently
- Date parsing should use event `ts` field, not system time
- Repo path should be absolute or resolved to absolute

### Example Event File Path

Event with:
- `feed_id`: `abc123`
- `event_id`: `evt-456`
- `ts`: `2026-01-10T14:30:00.000Z`

Written to:
```
{CONTEXT_REPO_PATH}/events/abc123/2026-01-10/evt-456.json
```

### Example Commit Flow

```
[receive event 1] -> write file
[receive event 2] -> write file
[receive event 3] -> write file
...
[receive event 10 OR timeout] -> git add . && git commit -m "Mirror: add 10 event(s)"
```

## Success Metrics

- Start relay, start mirror, POST 3 events → 3 files exist
- `git log` shows commit(s) with correct message
- SSE disconnect → mirror reconnects within backoff window
- SIGINT → pending events committed before exit

## Open Questions

- Should we track last-seen event ID for resume after restart?
- Should commit messages include feed_id(s)?
- Should we add a `--dry-run` flag for testing without git commits?
