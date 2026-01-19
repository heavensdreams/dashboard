// Backend API server - uses unified server.js from root
// This file is kept for backward compatibility with existing scripts
// The main server is at the root: server.js

// Set port to 8083 for local development (root server defaults to 8083)
process.env.PORT = process.env.PORT || '8083'

// Import and run the unified server from root
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootServerPath = path.join(__dirname, '../../server.js')

// Import the root server (it will start automatically)
await import(rootServerPath)
