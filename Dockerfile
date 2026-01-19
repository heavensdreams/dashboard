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

# Note: /data directory will be mounted as volume on Fly.io
# The server.js will create directories and data.json if they don't exist

# Note: /data directory will be mounted as volume on Fly.io
# We don't create it here - the volume mount will handle it
# The server.js will create directories if they don't exist

# Expose port
EXPOSE 8084

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8084/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "server.js"]

