require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT),
  ssl: { rejectUnauthorized: false },
});

async function test() {
  try {
    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('\n=== Connected to Supabase (gigflow) ===');
    console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

    const cats = await pool.query('SELECT name FROM categories ORDER BY name');
    console.log('Categories (' + cats.rows.length + '):', cats.rows.map(r => r.name).join(', '));

    const subs = await pool.query('SELECT COUNT(*) FROM subcategories');
    console.log('Subcategories:', subs.rows[0].count);

    console.log('\nDatabase is LIVE and ready!');
    console.log('Host:', process.env.DB_HOST);
    console.log('Supabase URL:', process.env.SUPABASE_URL);
  } catch (e) {
    console.error('Connection failed:', e.message);
  } finally {
    await pool.end();
  }
}

test();
