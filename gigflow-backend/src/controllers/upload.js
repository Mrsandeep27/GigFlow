const pool = require('../config/db');

// File upload using Supabase Storage (free 1GB)
// Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars

async function uploadToSupabase(fileBuffer, fileName, bucket = 'uploads') {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase Storage not configured');
  }

  // Create bucket if it doesn't exist (idempotent)
  await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
    },
    body: JSON.stringify({ id: bucket, name: bucket, public: true }),
  }).catch(() => {});

  const path = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
      'Content-Type': 'application/octet-stream',
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Upload failed: ${err}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

// POST /api/upload/avatar — Upload avatar image
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.body || !req.body.file || !req.body.fileName) {
      return res.status(400).json({ message: 'No file provided. Send base64 file and fileName.' });
    }

    const { file, fileName } = req.body;
    const buffer = Buffer.from(file, 'base64');

    // Max 2MB
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ message: 'File too large. Max 2MB.' });
    }

    const url = await uploadToSupabase(buffer, fileName, 'avatars');

    // Update user avatar
    await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [url, req.user.id]);

    res.json({ url, message: 'Avatar uploaded' });
  } catch (err) {
    console.error('Avatar upload error:', err.message);
    res.status(500).json({ message: err.message || 'Upload failed' });
  }
};

// POST /api/upload/portfolio — Upload portfolio image
exports.uploadPortfolio = async (req, res) => {
  try {
    if (!req.body || !req.body.file || !req.body.fileName) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const { file, fileName } = req.body;
    const buffer = Buffer.from(file, 'base64');

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'File too large. Max 5MB.' });
    }

    const url = await uploadToSupabase(buffer, fileName, 'portfolio');
    res.json({ url, message: 'File uploaded' });
  } catch (err) {
    console.error('Portfolio upload error:', err.message);
    res.status(500).json({ message: err.message || 'Upload failed' });
  }
};
