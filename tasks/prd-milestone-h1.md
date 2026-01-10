# PRD: Milestone H1 — Relay Ingest + SSE Stream

## Introduction

Milestone H1 adds the core relay functionality to Switchboard: the ability to create feeds, ingest events, stream them in real-time via SSE, and query persisted events. This milestone transforms the H0 scaffold into a working coordination primitive.

**Definition of Done:** You can POST an event and watch it appear over SSE.

## Goals

- Enable feed creation with optional policy metadata
- Accept and validate events against the canonical Zod schema
- Stream events in real-time via Server-Sent Events (per-feed)
- Persist events and make them queryable with cursor-based pagination
- Ensure idempotent ingestion (no duplicate events)

## User Stories

### US-001: Create Feed Endpoint
**Description:** As a developer, I want to create feeds via API so that I have isolated contexts for events.

**Acceptance Criteria:**
- [ ] `POST /feeds` accepts `{ name: string, policy_json?: object }`
- [ ] Returns `{ id, name, policy_json, created_at }` with 201 status
- [ ] `name` is required; returns 400 if missing
- [ ] `policy_json` is optional, stored as-is if provided
- [ ] Feed `id` is a UUID generated server-side
- [ ] Typecheck passes

### US-002: Get Feed Endpoint
**Description:** As a developer, I want to retrieve a feed by ID so that I can verify it exists.

**Acceptance Criteria:**
- [ ] `GET /feeds/:id` returns feed object with 200 status
- [ ] Returns 404 if feed does not exist
- [ ] Response matches create response shape
- [ ] Typecheck passes

### US-003: Ingest Event Endpoint
**Description:** As a developer, I want to POST events to a feed so that they are validated and persisted.

**Acceptance Criteria:**
- [ ] `POST /feeds/:id/events` accepts event matching canonical schema
- [ ] Validates against shared Zod schema (strict on required fields)
- [ ] Required fields: `event_id`, `feed_id`, `type`, `author_identity_id`, `source`, `ts`, `payload`
- [ ] `source` must have `platform`, `adapter_id`, `source_msg_id` (nullable)
- [ ] `payload` allows any object (passthrough)
- [ ] `refs` is optional, allows any object (passthrough)
- [ ] Returns 400 with validation errors if schema fails
- [ ] Returns 404 if feed does not exist
- [ ] Returns 201 with stored event on success
- [ ] Typecheck passes

### US-004: Event Idempotency
**Description:** As a developer, I want idempotent event ingestion so that retries don't create duplicates.

**Acceptance Criteria:**
- [ ] If `event_id` already exists, return 200 with existing event (no duplicate)
- [ ] If `(source_platform, source_msg_id)` already exists (and source_msg_id is not null), return 200 with existing event
- [ ] New events with unique identifiers return 201
- [ ] Typecheck passes

### US-005: SSE Stream Endpoint
**Description:** As a developer, I want to subscribe to a feed's event stream so that I receive events in real-time.

**Acceptance Criteria:**
- [ ] `GET /feeds/:id/stream` returns SSE stream (Content-Type: text/event-stream)
- [ ] Returns 404 if feed does not exist
- [ ] Connection stays open until client disconnects
- [ ] Each event sent as SSE message with `data:` prefix containing JSON event
- [ ] Typecheck passes

### US-006: Broadcast Events to SSE Clients
**Description:** As a developer, I want ingested events to be broadcast to connected SSE clients within 1 second.

**Acceptance Criteria:**
- [ ] When event is POSTed, all SSE clients connected to that feed receive it
- [ ] Event appears on SSE stream within 1 second of POST response
- [ ] Multiple clients on same feed all receive the event
- [ ] Events only broadcast to clients of the matching feed_id
- [ ] Typecheck passes

### US-007: Get Events Endpoint with Pagination
**Description:** As a developer, I want to query persisted events with cursor-based pagination.

**Acceptance Criteria:**
- [ ] `GET /feeds/:id/events` returns array of events
- [ ] Returns 404 if feed does not exist
- [ ] Supports `limit` query param (default 50, max 100)
- [ ] Supports `after_ts` query param (ISO-8601 timestamp)
- [ ] Events ordered ascending by `(ts, id)`
- [ ] Returns events where `ts > after_ts` (or `ts = after_ts AND id > after_id` if after_id provided)
- [ ] Typecheck passes

### US-008: Integration Test for Full Flow
**Description:** As a developer, I want an integration test that validates the complete flow.

**Acceptance Criteria:**
- [ ] Test creates a feed via POST /feeds
- [ ] Test connects SSE client to /feeds/:id/stream
- [ ] Test POSTs an event to /feeds/:id/events
- [ ] Test verifies SSE receives the event within 1 second
- [ ] Test verifies GET /feeds/:id/events returns the persisted event
- [ ] Test passes in CI environment
- [ ] Typecheck passes

## Functional Requirements

- FR-1: `POST /feeds` creates a feed with name (required) and policy_json (optional), returns full feed object
- FR-2: `GET /feeds/:id` returns feed by ID or 404
- FR-3: `POST /feeds/:id/events` validates event against shared Zod schema and persists to database
- FR-4: Event validation is strict on envelope fields, passthrough on payload and refs
- FR-5: Ingestion is idempotent: duplicate event_id or (source_platform, source_msg_id) returns existing event
- FR-6: `GET /feeds/:id/stream` opens SSE connection for real-time events
- FR-7: Ingested events broadcast to all SSE clients on matching feed within 1 second
- FR-8: `GET /feeds/:id/events` returns paginated events with cursor-based pagination (after_ts, limit)
- FR-9: Events ordered ascending by (ts, id) for deterministic pagination
- FR-10: All endpoints return 404 for non-existent feed_id

## Non-Goals

- No global stream across all feeds (per-feed only in H1)
- No global events query (per-feed only in H1)
- No authentication or authorization
- No WebSocket support (SSE only)
- No event deletion or updates
- No feed deletion or updates
- No adapter logic
- No UI

## Technical Considerations

- Use in-memory pub/sub for SSE broadcast (e.g., EventEmitter or similar)
- SSE clients should be tracked per feed_id for targeted broadcast
- Consider connection cleanup on client disconnect
- Reuse shared Zod schema from `packages/shared/schema/event.ts`
- Pagination uses existing `(feed_id, ts)` index from H0

### API Examples

**Create Feed:**
```http
POST /feeds
Content-Type: application/json

{ "name": "my feed", "policy_json": { "members": ["did:key:..."] } }
```
```json
{ "id": "uuid", "name": "my feed", "policy_json": { "members": ["did:key:..."] }, "created_at": "2026-01-10T..." }
```

**Ingest Event:**
```http
POST /feeds/:id/events
Content-Type: application/json

{
  "event_id": "uuid",
  "feed_id": "uuid",
  "type": "message",
  "author_identity_id": "did:key:...",
  "source": { "platform": "slack", "adapter_id": "slack-1", "source_msg_id": "msg123" },
  "ts": "2026-01-10T16:00:00.000Z",
  "payload": { "text": "hello world" },
  "refs": null
}
```

**Query Events:**
```http
GET /feeds/:id/events?limit=50&after_ts=2026-01-10T16:00:00.000Z
```

## Success Metrics

- POST event → SSE receives within 1 second
- Duplicate POSTs return 200 (not 201) with no new row
- GET events returns correct order and respects pagination
- Integration test passes reliably

## Open Questions

- Should SSE include event ID in SSE `id:` field for client-side resume?
- Should GET /feeds return a list of all feeds? (Useful for dev, but maybe H2)
- Should we add `after_id` to pagination now or defer to when needed?
