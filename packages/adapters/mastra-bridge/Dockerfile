FROM node:22-alpine

WORKDIR /app

# Ensure root tsconfig is available for workspace builds
COPY tsconfig.json ./

# Install workspace dependencies
COPY package*.json ./
COPY package-lock.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/adapters/mastra-bridge/package*.json ./packages/adapters/mastra-bridge/

RUN npm install

# Copy sources
COPY packages/shared ./packages/shared
COPY packages/adapters/mastra-bridge ./packages/adapters/mastra-bridge

# Build libraries
RUN npm run build --workspace=@switchboard/shared
RUN npm run build --workspace=@switchboard/mastra-bridge

CMD ["npm", "run", "start", "--workspace=@switchboard/mastra-bridge"]

