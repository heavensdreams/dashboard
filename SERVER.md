# Unified Server Configuration

## Overview

The `server.js` file at the root works for **both local development and Fly.io deployment** automatically.

## How It Works

### Environment Detection

The server automatically detects the environment:

- **Fly.io**: Checks if `/data` directory exists AND `DATA_DIR=/data` env var is set
- **Local**: Uses project root directory

### Configuration

#### Local Development
- **Port**: 8083 (default, or set via `PORT` env var)
- **Data file**: `./data.json` (project root)
- **Photos**: `./photos/` (project root)
- **Frontend**: API only mode (use Vite dev server on port 8084)

#### Fly.io Production
- **Port**: 8084 (set in `fly.toml`)
- **Data file**: `/data/data.json` (persistent volume)
- **Photos**: `/data/photos/` (persistent volume)
- **Frontend**: Serves static files from `frontend/dist/`

## Usage

### Local Development

```bash
# Start backend API (port 8083)
npm run dev:backend

# Or directly:
PORT=8083 node server.js

# Start frontend (port 8084) in another terminal
cd frontend && npm run dev
```

### Production (Fly.io)

```bash
# Build frontend
npm run build

# Deploy to Fly.io
fly deploy
```

The server will automatically:
- Detect Fly.io environment
- Use `/data` volume for persistence
- Serve built frontend from `dist/`
- Run on port 8084

## API Endpoints

All endpoints work the same in both environments:

- `POST /api/login` - User login
- `GET /api/data` - Load all data
- `POST /api/data` - Save all data
- `POST /api/upload` - Upload photo
- `GET /photos/:filename` - Serve photos
- `GET /api/public/properties/:ids` - Public property API
- `GET /api/health` - Health check

## File Structure

```
/mnt/ramdisk/rental/
├── server.js              # Unified server (works for both)
├── data.json              # Local data file
├── photos/                # Local photos
├── frontend/
│   ├── dist/              # Built frontend (production)
│   └── src/               # Frontend source
├── backend/api/
│   └── server.js          # Wrapper (imports root server.js)
└── fly.toml               # Fly.io configuration
```

## Testing

### Test Locally

```bash
# Start server
PORT=8083 node server.js

# Test health endpoint
curl http://localhost:8083/api/health

# Should return:
# {"status":"ok","tables":[...]}
```

### Test Production Build

```bash
# Build frontend
npm run build

# Start in production mode
NODE_ENV=production PORT=8084 node server.js

# Server will serve static files from frontend/dist/
```

## Notes

- The server automatically creates directories if they don't exist
- Data file is created with empty structure if missing
- Frontend is only served in production mode when `frontend/dist/` exists
- Local development uses Vite dev server for frontend (hot reload)
- Production serves pre-built static files

