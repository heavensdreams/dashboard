# Rental Application

A rental management application built with Electric SQL, PostgreSQL, Vite, React, and ShadCN UI.

## Architecture

- **Backend**: Electric SQL + PostgreSQL (Docker)
- **Frontend**: Vite + React + TypeScript + ShadCN UI
- **Photo Server**: Express.js (runs on port 8085, proxied through Vite)
- **Ports**:
  - 8082: PostgreSQL
  - 8083: Electric SQL
  - 8084: Vite frontend
  - 8085: Photo upload server

## Setup

### 1. Start Docker Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port 8082
- Electric SQL on port 8083

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Start Frontend and Photo Server

```bash
npm run dev
```

This will start:
- Vite dev server on port 8084
- Photo upload server on port 8085

## Features

- **User Management**: Admin can create and manage users (admin/normal roles)
- **Group Management**: Admin can create groups and assign users/properties to groups
- **Property Management**: Create and manage rental properties
- **Booking Management**: Create bookings with calendar view
- **Photo Management**: Upload multiple photos for users, properties, and bookings
- **Logging**: Comprehensive logging of all changes (admin only)
- **Full Replication**: All data synced to client, filtering done client-side

## Database Schema

- `users`: User accounts with roles
- `groups`: Property groups
- `user_groups`: Many-to-many user-group assignments
- `properties`: Rental properties
- `property_groups`: Many-to-many property-group assignments
- `bookings`: Property bookings
- `photos`: Photos for users, properties, and bookings
- `logs`: Change logs

## Notes

- No authentication/authorization (as per requirements)
- All data replicated to client
- Client-side filtering based on user groups
- Photos stored as MD5 hash filenames in `frontend/photos/` directory


