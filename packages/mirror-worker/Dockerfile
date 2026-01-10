FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace manifests and configs
COPY package*.json ./
COPY package-lock.json ./
COPY tsconfig.json ./

# Copy the shared and mirror-worker packages into the build context
COPY packages/shared ./packages/shared
COPY packages/mirror-worker ./packages/mirror-worker

RUN npm install

# Build shared first (mirror-worker dependency)
RUN npm run build --workspace=@switchboard/shared

# Build mirror-worker
RUN npm run build --workspace=@switchboard/mirror-worker

FROM node:22-alpine

WORKDIR /app

# Install git for git operations
RUN apk add --no-cache git

# Mirror the workspace layout so shared dependencies are available at runtime
COPY package*.json ./
COPY package-lock.json ./
COPY packages/shared ./packages/shared
COPY packages/mirror-worker ./packages/mirror-worker
RUN npm install --omit=dev

# Build shared for runtime (needed for workspace dependencies)
RUN npm run build --workspace=@switchboard/shared

COPY --from=builder /app/packages/mirror-worker/dist ./packages/mirror-worker/dist

# Create directory for context repo
RUN mkdir -p /data/context-repo

EXPOSE 3001

WORKDIR /app/packages/mirror-worker

CMD ["node", "dist/index.js"]
