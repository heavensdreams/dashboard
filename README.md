# Dubai Real Estate Rental Application

A rental management application built with Express.js, React, Vite, and simple JSON file storage.

## Architecture

- **Backend**: Express.js API server with simple JSON file storage
- **Frontend**: Vite + React + TypeScript + ShadCN UI
- **Data Storage**: Single `data.json` file in project root (no database)
- **Photo Storage**: MD5 hash filenames in `photos/` directory
- **Deployment**: Fly.io with persistent volume for data
- **Ports**:
  - 8083: Express API (local development)
  - 8084: Vite frontend (local development)
  - 8080: Express API (Fly.io production)

## Setup

### Local Development

### 1. Install Dependencies

```bash
npm install
cd frontend && npm install
```

### 2. Start Development Servers

```bash
npm run dev
```

This will start both the backend API (port 8083) and frontend (port 8084) concurrently.

### 3. Access the Application

- **Frontend**: http://localhost:8084
- **API**: http://localhost:8083

### Production Deployment (Fly.io)

The application is configured for Fly.io deployment:

```bash
fly deploy
```

The Fly.io deployment automatically:
- Builds the frontend for production
- Serves static files from the Express server
- Uses persistent volume for data storage
- Initializes with default data if volume is empty

## Data Flow

### LOAD DATA (App Start):
Browser → GET /api/data → Read data.json → Return JSON (no passwords) → Store in memory

### SAVE DATA (Any Change):
Browser (in-memory data) → POST /api/data → Validate → Write to data.json → Response

### PHOTOS:
Browser → POST /api/upload → Save file to disk with MD5 hash → Return MD5

### LOGIN:
Browser → POST /api/login → Check password in data.json → Return user (no password)

## API Endpoints

- `GET /api/data` - Load all data (passwords excluded)
- `POST /api/data` - Save all data (full dataset)
- `POST /api/login` - Login (checks password, returns user without password)
- `POST /api/upload` - Upload photo (returns MD5 hash)
- `GET /api/public/properties/:ids` - Public property view (no auth)
- `GET /api/health` - Health check

## Features

- **User Management**: Admin can create and manage users (admin/customer roles)
- **Group Management**: Admin can create groups and assign users/properties to groups
- **Property Management**: Create and manage rental properties with photos
- **Booking Management**: Create bookings with calendar view and availability
- **Photo Management**: Upload multiple photos for users, properties, and bookings
- **Logging**: Comprehensive logging of all changes (admin only)
- **Public API**: Property availability and booking data for external integration
- **Client-side Filtering**: All data loaded once, filtered in browser based on user permissions

## Data Structure

The `data.json` file contains all application data:

```json
{
  "users": [
    {
      "id": "string",
      "email": "string",
      "password": "string",
      "name": "string",
      "role": "admin|customer",
      "created_at": "2026-01-15T00:00:00.000Z"
    }
  ],
  "groups": [
    {
      "id": "string",
      "name": "string",
      "created_at": "2026-01-15T00:00:00.000Z"
    }
  ],
  "apartments": [
    {
      "id": "string",
      "name": "string",
      "address": "string",
      "extra_info": "string",
      "roi_info": "string",
      "roi_chart": "string",
      "photos": ["md5hash1.jpg", "md5hash2.jpg"],
      "bookings": [
        {
          "id": "string",
          "start_date": "2026-01-15T00:00:00.000Z",
          "end_date": "2026-01-16T00:00:00.000Z"
        }
      ],
      "created_at": "2026-01-15T00:00:00.000Z"
    }
  ],
  "user_groups": [
    {
      "user_id": "string",
      "group_id": "string"
    }
  ],
  "property_groups": [
    {
      "apartment_id": "string",
      "group_id": "string"
    }
  ],
  "logs": [
    {
      "id": "string",
      "timestamp": "2026-01-15T00:00:00.000Z",
      "action": "string",
      "details": "object"
    }
  ]
}
```

## Important Notes

- **Simple Storage**: All data stored in single JSON file - no database required
- **Date Format**: All dates use ISO string format with "Z" suffix (e.g., "2026-01-15T00:00:00.000Z")
- **Photo Storage**: Photos saved as MD5 hash filenames for uniqueness
- **Client-side State**: All data loaded once on app start, stored in memory
- **Auto-save**: Changes automatically saved to JSON file via API
- **Fly.io Ready**: Configured for production deployment with persistent volume


