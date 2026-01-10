# Context Repo Protocol v0.1

## Purpose

The Context Repo Protocol (CRP) defines the canonical structure for git-based context repositories. A context repo is a git repository that stores events, snapshots, and access policies in a standardized format, enabling tools and agents to share and synchronize context data in a consistent manner.

## Version

v0.1

## Directory Layout

A CRP-compliant repository MUST contain the following directories:

### `events/`

Stores event files organized by feed and date. Events represent discrete actions, messages, or state changes captured from various sources. This is the primary data store for the context repo.

### `snapshots/`

Stores point-in-time state snapshots. Snapshots capture the aggregated state at a specific moment, useful for fast reconstruction without replaying all events.

### `policy/`

Stores access control policies. Contains policy files that define who can read, write, or administer the context repo.

### `.crp/`

Stores repo metadata. Contains internal CRP files such as the manifest, version info, and other repo-level configuration.

## File Naming

This section defines the naming conventions for files within a CRP-compliant repository.

### Event Files

Event files are stored in the `events/` directory with the following path structure:

```
events/{feed_id}/{YYYY-MM-DD}/{event_id}.json
```

- `{feed_id}` - The UUID of the feed this event belongs to
- `{YYYY-MM-DD}` - The date of the event (extracted from the event timestamp)
- `{event_id}` - The UUID of the event, used as the filename

Example: `events/a1b2c3d4-e5f6-7890-abcd-ef1234567890/2026-01-10/f9e8d7c6-b5a4-3210-fedc-ba0987654321.json`

### Policy File

The policy file is stored at:

```
policy/policy.json
```

This file defines access control rules for the context repo.

### Manifest File

The manifest file is stored at:

```
.crp/manifest.json
```

This file contains repo-level metadata including the CRP version and creation timestamp.

### Snapshot Files

Snapshot naming conventions are reserved for future specification. Implementations SHOULD store snapshots in the `snapshots/` directory with a naming scheme that includes the snapshot timestamp.

## Event Format

Event files are JSON documents. Each event file MUST contain a single JSON object with the following structure.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `event_id` | string (UUID) | Unique identifier for this event |
| `feed_id` | string (UUID) | The feed this event belongs to |
| `type` | string | The event type (e.g., "message", "action", "state_change") |
| `author_identity_id` | string | Identifier of the entity that authored this event |
| `source` | object | Origin metadata for this event (see Source Object below) |
| `ts` | string (ISO-8601) | Timestamp when the event occurred |
| `payload` | object | Event-specific data; structure varies by event type |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `refs` | object | References to related events or external resources |

### Source Object

The `source` field describes where the event originated:

| Field | Type | Description |
|-------|------|-------------|
| `platform` | string | The platform or system where the event originated (e.g., "slack", "github") |
| `adapter_id` | string | Identifier of the adapter that captured this event |
| `source_msg_id` | string or null | Original message ID from the source platform, if applicable |

### Example Event

```json
{
  "event_id": "f9e8d7c6-b5a4-3210-fedc-ba0987654321",
  "feed_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "message",
  "author_identity_id": "user-12345",
  "source": {
    "platform": "slack",
    "adapter_id": "slack-adapter-001",
    "source_msg_id": "1704912000.123456"
  },
  "ts": "2026-01-10T14:30:00.000Z",
  "payload": {
    "text": "Hello, world!",
    "channel": "general"
  },
  "refs": {
    "parent_event_id": "abc123"
  }
}
```

## Policy

The policy file (`policy/policy.json`) defines access control for the context repo. This section documents the structure of the policy file.

### Policy File Structure

The policy file is a JSON document with the following structure:

| Field | Type | Description |
|-------|------|-------------|
| `members` | array | List of member identities with access to this context repo |
| `permissions` | object | Permission definitions mapping roles or identities to access levels |

### Members Array

The `members` array contains identity references for users or agents that have access to this context repo. Each member entry specifies an identity that is recognized by the policy.

### Permissions Object

The `permissions` object maps identities or roles to their access levels. The specific permission schema is implementation-defined and may include:

- Read access to events and snapshots
- Write access to create new events
- Administrative access to modify policy

### Example Policy

```json
{
  "members": [],
  "permissions": {}
}
```

### Policy Enforcement

Policy enforcement is reserved for future specification. Implementations SHOULD read the policy file but MAY defer enforcement to a later version of CRP.

## CI Guard

This section documents how to enable CI protection for CRP-compliant repositories.

### Canonical Rule

**Files under `events/` are immutable.** Once an event file is committed to the repository, it MUST NOT be modified or deleted.

### Why Events Are Immutable

Event immutability is a core design principle of CRP for the following reasons:

1. **Auditability** - Events form an audit log of everything that happened. Modifying or deleting events would undermine the integrity of this log and make it impossible to trust the historical record.

2. **Replayability** - Systems that consume events often need to replay them to reconstruct state. If events can be modified, replay would produce inconsistent results depending on when replay occurred.

3. **Append-only context** - The context repo serves as a shared context for agents and tools. Append-only semantics ensure all consumers see a consistent, growing log of events that never changes under their feet.

### Enabling the CI Guard

The CI guard is a GitHub Actions workflow that fails any pull request or push that modifies or deletes files in the `events/` directory.

To enable the CI guard in your context repo:

1. **Copy the check script** to your repository:
   ```bash
   mkdir -p scripts
   cp docs/crp/workflows/../../../scripts/check-append-only.sh scripts/check-append-only.sh
   chmod +x scripts/check-append-only.sh
   ```

2. **Copy the workflow file** to your GitHub workflows directory:
   ```bash
   mkdir -p .github/workflows
   cp docs/crp/workflows/append-only-guard.yml .github/workflows/append-only-guard.yml
   ```

3. **Commit and push** the workflow:
   ```bash
   git add scripts/check-append-only.sh .github/workflows/append-only-guard.yml
   git commit -m "Add append-only CI guard"
   git push
   ```

4. **Verify** the workflow appears in your repository's Actions tab.

After setup, any PR that attempts to modify or delete an existing event file will fail CI with a clear error message listing the offending files.

### Automated Setup

If you are using `crp_init` to initialize your context repo, you can pass the `--ci` flag to automatically set up the CI guard:

```bash
npx ts-node scripts/crp_init.ts /path/to/context-repo --ci
```

This will copy both the check script and the workflow file to your repository.
