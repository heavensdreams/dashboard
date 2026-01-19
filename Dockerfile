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
COPY backend/api/package*.json ./
RUN npm ci --only=production

# Copy built frontend and backend
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/backend/api/server.js ./server.js

# Create data directory for persistent storage
RUN mkdir -p /data/photos

# Expose port
EXPOSE 8084

# Start the server
CMD ["node", "server.js"]

