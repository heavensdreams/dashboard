// Electric SQL Write Proxy
// Proxies writes to PostgreSQL through Electric SQL's connection
// Electric SQL will then sync changes back via ShapeStream

const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// Connect to PostgreSQL (same connection Electric SQL uses)
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 8082,
  database: process.env.POSTGRES_DB || 'rental',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

app.post('/write', async (req, res) => {
  const { sql, params } = req.body;
  
  if (!sql) {
    return res.status(400).json({ error: 'SQL query required' });
  }

  try {
    const result = await pool.query(sql, params || []);
    res.json(result.rows);
  } catch (error) {
    console.error('Write error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.WRITE_PROXY_PORT || 8081;
app.listen(PORT, () => {
  console.log(`Electric SQL Write Proxy running on port ${PORT}`);
});

