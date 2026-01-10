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
