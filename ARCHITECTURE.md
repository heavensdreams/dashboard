# Rental Application Architecture

## Port Allocation

- **8082**: PostgreSQL - Main database
- **8083**: Electric SQL - Sync service (master-master replication)
- **8084**: Vite Frontend + Photo Upload Server
- **NO 8081**: Write proxy NOT needed - writes go to local database!

## Data Flow

### LOCAL-FIRST ARCHITECTURE (Master-Master Replication)

**READS:**
```
Browser → Local PGlite Database (instant, always available)
         ↓
    Electric SQL syncs from PostgreSQL in background
         ↓
    Local DB stays up-to-date automatically
```

**WRITES:**
```
Browser → Local PGlite Database (instant, offline-capable)
         ↓
    Electric SQL syncs to PostgreSQL (background)
         ↓
    PostgreSQL WAL (Write-Ahead Log)
         ↓
    Electric SQL syncs to all other clients (real-time)
```

**How it works:**
1. **Reads**: Query local PGlite database directly - always fast, works offline
2. **Writes**: Write to local PGlite database - instant, works offline
3. **Sync**: Electric SQL automatically syncs local DB ↔ PostgreSQL (bidirectional)
4. **Real-time**: All clients receive updates when PostgreSQL changes
5. **Conflicts**: Electric SQL handles conflict resolution automatically

## Key Points

- **ZERO Backend Logic**: Only Photo Upload (no write proxy needed!)
- **Local-First**: All operations happen on local database in browser
- **Offline-Capable**: Works completely offline, syncs when online
- **Master-Master**: All clients can write simultaneously
- **Auto-Replication**: Electric SQL handles all sync automatically
- **Real-Time**: All changes appear instantly on all clients
- **No REST API**: All operations on local database
- **No Mocks**: Everything uses real Electric SQL and PostgreSQL

## Components

1. **Electric SQL (8083)**: 
   - Syncs local PGlite DB ↔ PostgreSQL (bidirectional)
   - Monitors PostgreSQL WAL
   - Handles conflict resolution
   - Real-time sync to all clients

2. **PostgreSQL (8082)**:
   - Main database
   - WAL enabled for logical replication
   - Electric SQL monitors WAL

3. **Frontend (8084)**:
   - React + Electric SQL with PGlite (local database)
   - All reads from local database (instant)
   - All writes to local database (instant, offline-capable)
   - Photo uploads handled separately

## TanStack DB

- **OPTIONAL**: Electric SQL works standalone
- **COMPATIBLE**: TanStack DB can work on top of Electric SQL's local database
- **Benefits**: Provides reactive queries and optimistic updates
- **Not Required**: Electric SQL provides all needed functionality

