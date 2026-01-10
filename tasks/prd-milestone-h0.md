# PRD: Milestone H0 — Monorepo, Infra, Shared Canonical Schema

## Introduction

Milestone H0 establishes the structural foundation for the Switchboard / Coordination Feed system. It creates a monorepo with clear service boundaries, a canonical event schema shared across all components, a local development environment that boots deterministically, and a Postgres-backed relay service scaffold.

This milestone treats "context" as a coordination primitive. All future work (agents, humans, adapters, GitHub mirrors) depends on a stable event contract, shared data model, and predictable runtime environment. H0 is successful if later milestones can be built without revisiting foundational decisions.

## Goals

- Establish a monorepo structure with clear package boundaries
- Define a canonical event schema as the single source of truth
- Create a working local development environment with one-command startup
- Scaffold the relay-api service with health endpoint and Postgres connectivity
- Set up database migrations for core tables (feeds, events)
- Document how to boot and use the system

## User Stories

### US-001: Create Monorepo Structure
**Description:** As a developer, I need the repository organized with clear service boundaries so that all future work has a predictable location.

**Acceptance Criteria:**
- [ ] `packages/relay-api/` exists with package scaffolding
- [ ] `packages/mirror-worker/` exists as empty scaffold
- [ ] `packages/viewer-web/` exists as empty scaffold
- [ ] `packages/adapters/` exists as empty directory
- [ ] `packages/shared/schema/` exists
- [ ] `packages/shared/types/` exists
- [ ] `packages/shared/utils/` exists
- [ ] `infra/docker-compose.yml` exists
- [ ] `infra/migrations/` exists
- [ ] `docs/prd/milestone-h0.md` exists
- [ ] `docs/crp/crp-v0.1.md` placeholder exists
- [ ] `.env.example` exists with documented variables
- [ ] `README.md` exists with boot instructions
- [ ] Typecheck passes

### US-002: Define Canonical Event Schema
**Description:** As a developer, I need a single source of truth for event structure so that all services use the same contract.

**Acceptance Criteria:**
- [ ] Schema defined in `packages/shared/schema/event.ts`
- [ ] Schema uses Zod for validation
- [ ] Schema includes all required fields: `event_id`, `feed_id`, `type`, `author_identity_id`, `source`, `ts`, `payload`, `refs`
- [ ] `source` is an object with `platform`, `adapter_id`, `source_msg_id` fields
- [ ] `payload` allows unknown fields (forward-compatible)
- [ ] `refs` is optional and allows unknown fields
- [ ] Schema is importable by other packages
- [ ] Sample event validates successfully against schema
- [ ] Typecheck passes

### US-003: Create Relay API Scaffold
**Description:** As a developer, I need the relay-api service to boot and connect to Postgres so that I have a working foundation for future endpoints.

**Acceptance Criteria:**
- [ ] Service located at `packages/relay-api/`
- [ ] Service boots successfully via Docker Compose
- [ ] Service connects to Postgres on startup
- [ ] `GET /health` returns 200 OK
- [ ] Configurable via environment variables
- [ ] Logs startup clearly to stdout
- [ ] Fails loudly with clear error if DB is unreachable
- [ ] Typecheck passes

### US-004: Create Database Migrations
**Description:** As a developer, I need the database schema to be created via migrations so that the environment is deterministic and reproducible.

**Acceptance Criteria:**
- [ ] `feeds` table created with columns: `id` (uuid, pk), `name` (text), `policy_json` (jsonb, nullable), `created_at` (timestamp)
- [ ] `events` table created with columns: `id` (uuid, pk), `feed_id` (uuid, fk), `type` (text), `author_identity_id` (text), `source_platform` (text), `source_msg_id` (text, nullable), `ts` (timestamp), `payload_json` (jsonb), `refs_json` (jsonb, nullable)
- [ ] Index on `(feed_id, ts)`
- [ ] Unique index on `(source_platform, source_msg_id)` that is nullable-safe
- [ ] Migrations are deterministic and replayable
- [ ] Migrations runnable automatically on container startup or via explicit command

### US-005: Create Docker Compose Environment
**Description:** As a developer, I need to start the entire system with one command so that local development is frictionless.

**Acceptance Criteria:**
- [ ] `docker compose up` starts Postgres
- [ ] `docker compose up` starts relay-api
- [ ] Postgres is accessible to relay-api
- [ ] Migrations run successfully
- [ ] No cloud dependencies required
- [ ] No secrets hardcoded in docker-compose.yml
- [ ] `.env.example` documents all required environment variables

### US-006: Create README Documentation
**Description:** As a developer, I need clear documentation so that I can understand and boot the system without external help.

**Acceptance Criteria:**
- [ ] README explains what the project is
- [ ] README lists prerequisites (Docker, etc.)
- [ ] README provides step-by-step boot instructions
- [ ] README explains how to run migrations
- [ ] README explains how to verify the system is working (`/health` endpoint)

## Functional Requirements

- FR-1: Repository must follow exact directory structure specified (no deviations)
- FR-2: Canonical event schema must be defined in `packages/shared/schema/event.ts` using Zod
- FR-3: Event schema must validate all required fields with correct types
- FR-4: Event schema must allow unknown fields in `payload` and `refs` for forward compatibility
- FR-5: Relay API must expose `GET /health` endpoint returning 200 OK
- FR-6: Relay API must connect to Postgres and fail loudly if connection fails
- FR-7: Database must have `feeds` and `events` tables with specified columns
- FR-8: Database must have indexes on `(feed_id, ts)` and unique on `(source_platform, source_msg_id)`
- FR-9: `docker compose up` must boot entire system with no manual steps
- FR-10: All environment variables must be documented in `.env.example`

## Non-Goals

- No GitHub API integration
- No mirror worker logic (scaffold only)
- No event ingestion endpoints
- No streaming (SSE / WebSocket)
- No authentication
- No authorization
- No UI rendering
- No agents
- No adapters
- No viewer-web logic (scaffold only)

## Technical Considerations

- Use TypeScript for relay-api and shared packages
- Use Zod for schema validation (machine-validated, type-safe)
- Use Postgres as the database
- Migrations should use a standard tool (e.g., node-pg-migrate, knex, or raw SQL files)
- Prefer boring defaults over clever abstractions
- Write code as if it will be read by agents

## Success Metrics

- `docker compose up` boots Postgres and relay-api without errors
- `GET /health` returns 200 OK
- Database tables exist with correct schema
- Shared event schema validates a sample event
- Repository structure exactly matches specification
- A new developer (or agent) can boot the system by reading README alone

## Open Questions

- Preferred migration tool? (node-pg-migrate, knex, raw SQL, or other)
- Preferred Node.js web framework for relay-api? (Express, Fastify, Hono, or other)
- TypeScript or Python for shared schema? (PRD suggests TypeScript with Zod)
