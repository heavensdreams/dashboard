# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./frontend/
COPY backend/api/package*.json ./backend/api/

# Install dependencies
RUN cd frontend && npm ci
RUN cd backend/api && npm ci

# Copy source files
COPY frontend ./frontend
COPY backend/api ./backend/api

# Build frontend
RUN cd frontend && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend and unified server
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY server.js ./

# Copy default data and photos for initialization
COPY .fly/default-data.json ./.fly/default-data.json
COPY .fly/default-photos ./.fly/default-photos/
COPY .fly/init-data.sh ./.fly/init-data.sh

# Note: /data directory will be mounted as volume on Fly.io (if volume exists)
# Otherwise, server.js uses /tmp/app-data (ephemeral)
# Server.js will auto-initialize with default data.json and photos on first run

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "server.js"]

