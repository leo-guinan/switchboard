# Switchboard

Switchboard is a coordination feed system that provides a unified event stream for multi-agent and multi-platform communication. It acts as a relay layer that normalizes events from various sources into a canonical format.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Quick Start

1. **Copy the environment template**

   ```bash
   cp .env.example .env
   ```

2. **Start the system**

   ```bash
   docker compose -f infra/docker-compose.yml up --build
   ```

   This will:
   - Start a PostgreSQL database
   - Run database migrations
   - Start the relay-api service

3. **Verify the system is working**

   ```bash
   curl http://localhost:3000/health
   ```

   You should see:
   ```json
   {"status":"ok","database":"connected"}
   ```

## Architecture

```
packages/
├── relay-api/       # HTTP API service for event ingestion and queries
├── mirror-worker/   # Worker for mirroring events (scaffold)
├── viewer-web/      # Web UI for viewing feeds (scaffold)
├── adapters/        # Platform-specific adapters
└── shared/          # Shared schemas, types, and utilities

infra/
├── docker-compose.yml   # Local development environment
└── migrations/          # SQL database migrations

docs/
├── prd/             # Product requirements documents
└── crp/             # Coordination protocol specs
```

## Discord Adapter

The `packages/adapters/discord` workspace ships a Discord bot that keeps a relay feed and a configured channel in sync:

- **Inbound**: listens for messages in `DISCORD_CHANNEL_ID`, normalizes them into canonical `message` events, and POSTs them to `/v1/events`.
- **Outbound**: subscribes to the feed SSE stream (`GET /v1/feeds/:id/stream`) and posts `task` events back into Discord (skip events that already came from Discord to avoid a loop).
- **Task creation**: it registers a `/task` slash command so teammates can publish `task` events directly from Discord.

### Configuration

Copy the example env file, then populate your Discord + Relay credentials:

```bash
cp packages/adapters/discord/.env.example packages/adapters/discord/.env
# edit the file with your bot token, guild/channel IDs, relay URL, and feed ID
```

### Running

You can launch the adapter with the rest of the stack:

```bash
docker compose -f infra/docker-compose.yml up --build
```

Or build+run it manually while iterating:

```bash
npm run build --workspace=@switchboard/discord-adapter
npm run start --workspace=@switchboard/discord-adapter
```

Slash commands are registered during startup, so restart the adapter whenever you change `/task`.

## Mastra Bridge

`packages/adapters/mastra-bridge` is a lightweight SDK and runtime helper for plugging Mastra agents into a switchboard feed:

- `createSwitchboardTools(relayUrl, feedId, options?)` exposes `publishEvent`, `getRecentEvents`, and `claimTask`, so agents read context, claim ownership, and write canonical events with a consistent source identity.
- `createFeedSubscriber(relayUrl, feedId)` wires a SSE stream to feed agent workers.
- `runAgentWorker({ agent, tools, subscriber, routing, claimStrategy })` ties the agent, routing policy, claim logic, and the feed subscription together.

Use `claimTask` before generating outputs so only the current agent reacts to the task while others skip it. The bridge package ships as a Docker service (`mastra-bridge`) in `infra/docker-compose.yml`, or you can run it directly:

```bash
npm run build --workspace=@switchboard/mastra-bridge
npm run start --workspace=@switchboard/mastra-bridge
```

Define `RELAY_BASE_URL`, `FEED_ID`, `AUTH_TOKEN`, and agent configuration via `packages/adapters/mastra-bridge/.env.example`.
You can tune the runtime behavior with the following environment variables:

- `BRIDGE_AGENT_ID` – identity used for published events (defaults to `mastra-bridge`).
- `BRIDGE_ROUTING_TYPE` – feeds only events whose `type` matches the value (defaults to `task`).
- `CLAIM_LEASE_MS` – lease duration in milliseconds when claiming a task (defaults to `120000`).

## Development

### Stopping the system

```bash
docker compose -f infra/docker-compose.yml down
```

### Viewing logs

```bash
docker compose -f infra/docker-compose.yml logs -f relay-api
```

### Resetting the database

```bash
docker compose -f infra/docker-compose.yml down -v
docker compose -f infra/docker-compose.yml up --build
```
