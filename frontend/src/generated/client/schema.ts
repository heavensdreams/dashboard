// Generated schema for Electric SQL
// This schema matches the PostgreSQL database structure

import { DbSchema } from 'electric-sql/client/model'
import type { TableSchemas } from 'electric-sql/client/model'

// Define table schemas matching PostgreSQL structure
const tables: TableSchemas = {} as any

// Create migrations array (empty for now, Electric will sync from PostgreSQL)
const migrations: any[] = []
const pgMigrations: any[] = []

// Create the schema
export const schema = new DbSchema(tables, migrations, pgMigrations)

