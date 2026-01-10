# PRD: Milestone H2 — Context Repo Protocol Spec + Repo Bootstrapper

## Introduction

Milestone H2 defines the Context Repo Protocol (CRP) specification and provides a bootstrapper script to initialize new context repositories. CRP establishes the canonical structure for how events are stored in git repositories, enabling the mirror worker (H3) and future tooling to operate on a predictable file layout.

**Definition of Done:** `docs/crp-v0.1.md` exists and `crp_init` script can initialize a new context repo.

## Goals

- Document the Context Repo Protocol v0.1 specification
- Define directory layout, file naming conventions, and event file format
- Create a Node.js script to bootstrap new context repositories
- Enable optional git initialization via flag

## User Stories

### US-001: Create CRP v0.1 Specification Document
**Description:** As a developer, I need a specification document so that all tools agree on context repo structure.

**Acceptance Criteria:**
- [ ] `docs/crp/crp-v0.1.md` exists
- [ ] Documents the purpose and scope of CRP
- [ ] Specifies version: v0.1
- [ ] Typecheck passes

### US-002: Document Directory Layout in Spec
**Description:** As a developer, I need the directory structure documented so that I know where files belong.

**Acceptance Criteria:**
- [ ] Spec documents `events/` directory for event files
- [ ] Spec documents `snapshots/` directory for state snapshots
- [ ] Spec documents `policy/` directory for access policies
- [ ] Spec documents `.crp/` directory for metadata
- [ ] Each directory has a description of its purpose
- [ ] Typecheck passes

### US-003: Document File Naming Conventions in Spec
**Description:** As a developer, I need file naming conventions so that events are organized predictably.

**Acceptance Criteria:**
- [ ] Spec documents event file naming: `events/{feed_id}/{YYYY-MM-DD}/{event_id}.json`
- [ ] Spec documents snapshot naming convention
- [ ] Spec documents policy file naming: `policy/policy.json`
- [ ] Spec documents `.crp/manifest.json` for repo metadata
- [ ] Typecheck passes

### US-004: Document Event File Format in Spec
**Description:** As a developer, I need the event file format documented so that files are parseable.

**Acceptance Criteria:**
- [ ] Spec documents that event files are JSON
- [ ] Spec documents required fields match canonical schema (event_id, feed_id, type, author_identity_id, source, ts, payload, refs)
- [ ] Spec documents that payload is freeform object
- [ ] Spec includes example event file
- [ ] Typecheck passes

### US-005: Document Policy Reference in Spec
**Description:** As a developer, I need policy structure documented so that access control is consistent.

**Acceptance Criteria:**
- [ ] Spec documents `policy/policy.json` structure
- [ ] Spec documents placeholder fields: `members`, `permissions`
- [ ] Notes that policy enforcement is future work
- [ ] Typecheck passes

### US-006: Create crp_init Script Scaffold
**Description:** As a developer, I need a Node.js script to bootstrap context repos.

**Acceptance Criteria:**
- [ ] `scripts/crp_init.ts` exists (or `packages/shared/scripts/crp_init.ts`)
- [ ] Script accepts target directory as argument
- [ ] Script is executable via `npx ts-node scripts/crp_init.ts <path>`
- [ ] Typecheck passes

### US-007: crp_init Creates Directory Structure
**Description:** As a developer, I want crp_init to create the standard CRP directories.

**Acceptance Criteria:**
- [ ] Creates `events/` directory
- [ ] Creates `snapshots/` directory
- [ ] Creates `policy/` directory
- [ ] Creates `.crp/` directory
- [ ] Directories created with `.gitkeep` files where empty
- [ ] Typecheck passes

### US-008: crp_init Writes README
**Description:** As a developer, I want crp_init to generate a README explaining the repo.

**Acceptance Criteria:**
- [ ] Creates `README.md` in target directory
- [ ] README explains this is a Context Repo
- [ ] README links to CRP spec (or explains structure inline)
- [ ] README documents the directory layout
- [ ] Typecheck passes

### US-009: crp_init Writes Policy Skeleton
**Description:** As a developer, I want crp_init to generate a placeholder policy file.

**Acceptance Criteria:**
- [ ] Creates `policy/policy.json`
- [ ] Policy JSON has `members: []` array
- [ ] Policy JSON has `permissions: {}` object
- [ ] File is valid JSON
- [ ] Typecheck passes

### US-010: crp_init Writes Manifest
**Description:** As a developer, I want crp_init to generate a manifest file with repo metadata.

**Acceptance Criteria:**
- [ ] Creates `.crp/manifest.json`
- [ ] Manifest includes `version: "0.1"`
- [ ] Manifest includes `created_at` timestamp
- [ ] File is valid JSON
- [ ] Typecheck passes

### US-011: crp_init Optional Git Init
**Description:** As a developer, I want crp_init to optionally initialize git.

**Acceptance Criteria:**
- [ ] Accepts `--git` flag
- [ ] When `--git` passed, runs `git init` in target directory
- [ ] When `--git` passed, creates initial commit with message "Initialize context repo"
- [ ] Without `--git`, does not touch git
- [ ] Typecheck passes

## Functional Requirements

- FR-1: CRP spec document must exist at `docs/crp/crp-v0.1.md`
- FR-2: Spec must define directory layout: `events/`, `snapshots/`, `policy/`, `.crp/`
- FR-3: Spec must define file naming: `events/{feed_id}/{YYYY-MM-DD}/{event_id}.json`
- FR-4: Spec must define event file format matching canonical schema
- FR-5: Spec must define policy file structure with placeholder fields
- FR-6: `crp_init` script must create all CRP directories
- FR-7: `crp_init` must generate README, policy skeleton, and manifest
- FR-8: `crp_init` must support `--git` flag for optional git initialization
- FR-9: All generated files must be valid JSON where applicable

## Non-Goals

- No policy enforcement logic (future milestone)
- No sync/conflict resolution semantics (future milestone)
- No snapshot generation logic
- No validation of existing repos
- No migration tooling for existing repos

## Technical Considerations

- Script should be in TypeScript, runnable via ts-node or compiled
- Use Node.js `fs` module for file operations
- Use `child_process` for git commands when `--git` flag used
- Consider adding to package.json scripts for easier invocation
- Spec should be written in Markdown for easy reading and versioning

### Example Directory Structure (after crp_init)

```
my-context-repo/
├── .crp/
│   └── manifest.json
├── events/
│   └── .gitkeep
├── snapshots/
│   └── .gitkeep
├── policy/
│   └── policy.json
└── README.md
```

### Example manifest.json

```json
{
  "version": "0.1",
  "created_at": "2026-01-10T12:00:00.000Z"
}
```

### Example policy.json

```json
{
  "members": [],
  "permissions": {}
}
```

## Success Metrics

- `docs/crp/crp-v0.1.md` is complete and readable
- `crp_init /tmp/test-repo` creates correct structure
- `crp_init /tmp/test-repo --git` also initializes git with commit
- Mirror worker (H3) can use this structure without modifications

## Open Questions

- Should manifest include feed_id if repo is single-feed?
- Should we add a `crp validate` command in a future milestone?
- Should snapshots have a defined format in v0.1 or defer to later?
