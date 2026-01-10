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

_To be documented in subsequent user stories._

## Policy

_To be documented in subsequent user stories._
