const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 5432,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false },
});

pool.connect().then(client => {
  console.log('✓ Database connected successfully');
  client.release();
}).catch(err => {
  console.error('✗ Database connection failed:', err.message);
  process.exit(1);
});

// pg-compatible query wrapper: pool.query(sql, params) returns { rows }
module.exports = pool;
