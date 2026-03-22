const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

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

// Test connection on startup (don't exit in serverless)
pool.connect().then(client => {
  console.log('✓ Database connected successfully');
  client.release();
}).catch(err => {
  console.error('✗ Database connection failed:', err.message);
  // Only exit in standalone server mode, not in serverless
  if (process.env.VERCEL !== '1') process.exit(1);
});

// Monitor pool errors
pool.on('error', (err) => {
  console.error('Unexpected pool error:', err.message);
});

module.exports = pool;
