FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace manifests and configs
COPY package*.json ./
COPY package-lock.json ./
COPY tsconfig.json ./

# Copy the shared and relay packages into the build context
COPY packages/shared ./packages/shared
COPY packages/relay-api ./packages/relay-api

RUN npm install

# Build only the relay-api workspace
RUN npm run build --workspace=@switchboard/relay-api

FROM node:22-alpine

WORKDIR /app

# Mirror the workspace layout so shared dependencies are available at runtime
COPY package*.json ./
COPY package-lock.json ./
COPY packages/shared ./packages/shared
COPY packages/relay-api ./packages/relay-api
RUN npm install --omit=dev

COPY --from=builder /app/packages/relay-api/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
