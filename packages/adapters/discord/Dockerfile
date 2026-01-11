FROM node:22-alpine

WORKDIR /app

# Install workspace dependencies
COPY package*.json ./
COPY package-lock.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/adapters/discord/package*.json ./packages/adapters/discord/

RUN npm install

# Copy package sources
COPY packages/shared ./packages/shared
COPY packages/adapters/discord ./packages/adapters/discord

# Build shared types + Discord adapter
RUN npm run build --workspace=@switchboard/shared
RUN npm run build --workspace=@switchboard/discord-adapter

CMD ["npm", "run", "start", "--workspace=@switchboard/discord-adapter"]

