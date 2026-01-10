# PRD: Milestone H6 — Minimal Viewer + Mirror Status

## Introduction

Milestone H6 creates a minimal web viewer that displays live events from the relay and shows mirror synchronization status. This provides visibility into the coordination feed for developers and operators, showing both real-time event flow and how far the GitHub mirror has synced.

**Definition of Done:** Viewer shows live feed from relay + "mirrored up to commit X / event Y" status.

## Goals

- Display live events from relay via SSE
- Show list of available feeds
- Toggle between formatted cards and raw JSON view
- Display mirror sync status (last commit, last event)
- Provide a simple, functional UI with Tailwind CSS

## User Stories

### US-001: Add GET /feeds endpoint to relay
**Description:** As a developer, I need to list all feeds so the viewer can show available feeds.

**Acceptance Criteria:**
- [ ] GET /feeds returns array of all feeds
- [ ] Each feed includes id, name, policy_json, created_at
- [ ] Returns empty array if no feeds exist
- [ ] Response ordered by created_at descending (newest first)
- [ ] Typecheck passes

### US-002: Add /health endpoint to mirror worker
**Description:** As a developer, I need the mirror to expose sync status via health endpoint.

**Acceptance Criteria:**
- [ ] Mirror starts HTTP server on configurable PORT (default 3001)
- [ ] GET /health returns JSON with status, last_commit_sha, last_event_id, last_event_ts
- [ ] last_commit_sha is the most recent commit pushed (null if none)
- [ ] last_event_id is the ID of the most recent event written (null if none)
- [ ] Includes uptime_seconds and feed_ids being mirrored
- [ ] Typecheck passes

### US-003: Create viewer-web package scaffold
**Description:** As a developer, I need the viewer-web package set up with React and Tailwind.

**Acceptance Criteria:**
- [ ] packages/viewer-web/package.json exists with react, react-dom, vite dependencies
- [ ] packages/viewer-web/tailwind.config.js exists
- [ ] packages/viewer-web/index.html exists as entry point
- [ ] packages/viewer-web/src/main.tsx exists as React entry
- [ ] packages/viewer-web/src/App.tsx exists as root component
- [ ] npm run dev starts Vite dev server
- [ ] Typecheck passes

### US-004: Create feed list component
**Description:** As a user, I want to see available feeds so I can select one to view.

**Acceptance Criteria:**
- [ ] FeedList component fetches feeds from GET /feeds on mount
- [ ] Displays each feed as clickable item with name
- [ ] Shows loading state while fetching
- [ ] Shows empty state if no feeds
- [ ] Clicking feed selects it (passes feed_id to parent)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Create event stream hook
**Description:** As a developer, I need a hook to subscribe to SSE events for a feed.

**Acceptance Criteria:**
- [ ] useEventStream(feedId) hook in src/hooks/useEventStream.ts
- [ ] Connects to /feeds/{feedId}/stream via EventSource
- [ ] Returns array of events (newest first, limited to last 100)
- [ ] Handles connection errors gracefully
- [ ] Cleans up EventSource on unmount or feedId change
- [ ] Typecheck passes

### US-006: Create event card component
**Description:** As a user, I want to see events as formatted cards.

**Acceptance Criteria:**
- [ ] EventCard component displays: type, author_identity_id, ts, source.platform
- [ ] Shows relative time (e.g., "2 minutes ago")
- [ ] Truncates long payload with expand option
- [ ] Uses Tailwind for styling (cards with borders, padding)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: Create raw JSON view component
**Description:** As a user, I want to see events as raw JSON for debugging.

**Acceptance Criteria:**
- [ ] RawEventView component displays full event JSON
- [ ] Uses monospace font with syntax highlighting (or pre-formatted)
- [ ] Each event in its own code block
- [ ] Scrollable if content is long
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Create view toggle
**Description:** As a user, I want to toggle between card view and raw JSON view.

**Acceptance Criteria:**
- [ ] Toggle button/tabs at top of event list: "Cards" | "Raw JSON"
- [ ] Default view is Cards
- [ ] Toggle state persists during session
- [ ] Switching view doesn't lose events
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-009: Create event list with live updates
**Description:** As a user, I want to see events appear in real-time.

**Acceptance Criteria:**
- [ ] EventList component uses useEventStream hook
- [ ] New events appear at top of list automatically
- [ ] Shows "Connected" / "Disconnected" status indicator
- [ ] Shows event count
- [ ] Respects view toggle (cards or raw)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-010: Create mirror status component
**Description:** As a user, I want to see mirror sync status.

**Acceptance Criteria:**
- [ ] MirrorStatus component fetches from mirror /health endpoint
- [ ] Displays last_commit_sha (truncated to 7 chars with link placeholder)
- [ ] Displays last_event_id
- [ ] Displays last_event_ts as relative time
- [ ] Shows "Mirror offline" if health check fails
- [ ] Polls every 10 seconds for updates
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-011: Create main layout and wire up components
**Description:** As a user, I want a cohesive layout combining all components.

**Acceptance Criteria:**
- [ ] App.tsx has two-column or sidebar layout
- [ ] Left/sidebar: FeedList + MirrorStatus
- [ ] Main area: EventList with view toggle
- [ ] Header with "Switchboard Viewer" title
- [ ] Responsive layout (stacks on mobile)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-012: Add viewer to docker-compose
**Description:** As a developer, I want to run viewer with docker-compose.

**Acceptance Criteria:**
- [ ] packages/viewer-web/Dockerfile exists
- [ ] infra/docker-compose.yml updated with viewer-web service
- [ ] Viewer accessible on port 5173 (or configured port)
- [ ] Viewer can reach relay-api via internal network
- [ ] Typecheck passes

## Functional Requirements

- FR-1: GET /feeds endpoint returns list of all feeds
- FR-2: Mirror /health returns last_commit_sha, last_event_id, last_event_ts
- FR-3: Viewer connects to relay SSE and displays events in real-time
- FR-4: Events can be viewed as formatted cards or raw JSON
- FR-5: Mirror status polls and displays sync progress
- FR-6: Viewer runs in Docker alongside relay and mirror

## Non-Goals

- No authentication (public viewer for H6)
- No event creation from viewer (read-only)
- No event filtering or search
- No historical event pagination (only live + recent buffer)
- No mobile-optimized design (functional responsive only)

## Technical Considerations

### Relay /feeds Endpoint
```http
GET /feeds
```
```json
[
  { "id": "uuid", "name": "my-feed", "policy_json": null, "created_at": "..." },
  ...
]
```

### Mirror /health Response
```json
{
  "status": "ok",
  "last_commit_sha": "abc1234",
  "last_event_id": "evt-567",
  "last_event_ts": "2026-01-10T15:30:00.000Z",
  "uptime_seconds": 3600,
  "feed_ids": ["feed-1", "feed-2"]
}
```

### Environment Variables for Viewer
- `VITE_RELAY_URL` - Base URL of relay API (default: http://localhost:3000)
- `VITE_MIRROR_URL` - Base URL of mirror health endpoint (default: http://localhost:3001)

## Success Metrics

- Events appear in viewer within 2 seconds of POST to relay
- Mirror status updates every 10 seconds
- Viewer loads and connects without errors
- Toggle between views works smoothly

## Open Questions

- Should we add sound/notification for new events?
- Should mirror status show commit link to GitHub?
- Should we add "clear events" button for the buffer?
