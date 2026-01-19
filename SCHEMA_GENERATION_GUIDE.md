# Electric SQL Schema Generation Guide

## Current Status

✅ **WASM issues fixed** - Vite now serves WASM files correctly  
✅ **WaSqlite working** - Database initializes successfully  
⚠️ **Schema needed** - Electric SQL requires generated schema

## How to Generate Schema

Electric SQL needs to generate the TypeScript schema from your PostgreSQL database. Here's how:

### Step 1: Ensure Services Are Running

```bash
# Start PostgreSQL and Electric SQL
docker-compose up -d

# Verify they're running
docker-compose ps
```

### Step 2: Generate Schema

```bash
cd frontend
npx electric-sql generate --service http://localhost:8083
```

This will:
- Connect to Electric SQL service at `http://localhost:8083`
- Read the database schema from PostgreSQL
- Generate TypeScript files in `frontend/src/generated/client/`

### Step 3: Update electric.ts

After generation, update `frontend/src/lib/electric.ts`:

```typescript
// Replace the manual schema with generated one
import { schema } from './generated/client'

// Remove the manual DbSchema creation
// const schema = new DbSchema(...)
```

### Step 4: Restart Dev Server

```bash
npm run dev
```

## What Gets Generated

The `generate` command creates:
- `schema.ts` - TypeScript schema definitions
- `client.ts` - Type-safe client
- Migration files
- All table definitions with proper types

## Troubleshooting

If generation fails:
1. Check Electric SQL is running: `docker-compose ps`
2. Check Electric SQL logs: `docker-compose logs electric`
3. Verify connection: `curl http://localhost:8083`
4. Try with explicit URL: `npx electric-sql generate --service http://localhost:8083 --out ./src/generated`

## Next Steps After Generation

Once schema is generated:
1. Update `electric.ts` to import generated schema
2. Restart dev server
3. Test Electric SQL connection
4. Verify data sync works

