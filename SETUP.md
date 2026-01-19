# Setup Instructions

## Prerequisites
- Docker and Docker Compose
- Node.js 18+ and npm

## Quick Start

1. **Start Docker services:**
   ```bash
   docker-compose up -d
   ```
   This starts:
   - PostgreSQL on port 8082
   - Electric SQL on port 8083 (may need additional configuration)

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Start the application:**
   ```bash
   npm run dev
   ```
   This starts:
   - Vite dev server on port 8084
   - Photo upload server on port 8085

## Electric SQL Configuration

The Electric SQL container may need additional configuration. Check the logs:
```bash
docker-compose logs electric
```

If Electric SQL is not running properly, you may need to:
1. Ensure PostgreSQL has logical replication enabled (already configured in docker-compose.yml)
2. Check Electric SQL documentation for proper setup
3. The app will work with mock data until Electric is properly configured

## Access the Application

- Frontend: http://localhost:8084
- Photo API: http://localhost:8085/api/upload
- PostgreSQL: localhost:8082
- Electric SQL: localhost:8083

## Default User

The app starts with a default admin user:
- Email: admin@example.com
- Role: admin

## Notes

- All data is currently using in-memory storage until Electric SQL is fully configured
- Photos are stored in `frontend/photos/` directory
- No authentication is implemented (as per requirements)


