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

_To be documented in subsequent user stories._

## Event Format

_To be documented in subsequent user stories._

## Policy

_To be documented in subsequent user stories._
