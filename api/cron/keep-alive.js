// Vercel Cron Job — pings Supabase every 5 days to prevent free-tier pausing
// Supabase pauses projects after 7 days of inactivity

const pool = require('../../gigflow-backend/src/config/db');

module.exports = async (req, res) => {
  // Verify this is called by Vercel Cron (not external)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await pool.query('SELECT NOW() as time, current_database() as db');
    const row = result.rows[0];
    console.log(`✓ Keep-alive ping: ${row.db} at ${row.time}`);
    res.json({
      status: 'ok',
      database: row.db,
      timestamp: row.time,
      message: 'Supabase kept alive',
    });
  } catch (error) {
    console.error('✗ Keep-alive failed:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
