# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/viewer-web/package*.json ./packages/viewer-web/

# Install dependencies
RUN npm install

# Copy shared package source and build it first
COPY packages/shared/ ./packages/shared/
RUN npm run build --workspace=@switchboard/shared

# Copy viewer-web source
COPY packages/viewer-web/ ./packages/viewer-web/

# Set build-time environment variables
ARG VITE_RELAY_URL=http://localhost:3000
ARG VITE_MIRROR_URL=http://localhost:3001

# Build the viewer-web app
WORKDIR /app/packages/viewer-web
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built assets to nginx html directory
COPY --from=builder /app/packages/viewer-web/dist /usr/share/nginx/html

# Copy custom nginx config for SPA routing
RUN echo 'server { \
    listen 5173; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
