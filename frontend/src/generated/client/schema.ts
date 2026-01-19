// Generated schema for Electric SQL
// This schema matches the PostgreSQL database structure

import { DbSchema } from 'electric-sql/client/model'

// Define table schemas matching PostgreSQL structure
// Using any to avoid complex type requirements for empty schema
const tables: any = {}

// Create migrations array (empty for now, Electric will sync from PostgreSQL)
const migrations: any[] = []
const pgMigrations: any[] = []

// Create the schema
export const schema = new DbSchema(tables, migrations, pgMigrations)
