const pool = require('../config/db');
const crypto = require('crypto');

// Ensure payments table exists
let tableChecked = false;
async function ensureTable() {
  if (tableChecked) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        gig_id INT REFERENCES gigs(id) ON DELETE SET NULL,
        employer_id INT REFERENCES users(id) ON DELETE SET NULL,
        worker_id INT REFERENCES users(id) ON DELETE SET NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        status VARCHAR(50) DEFAULT 'pending',
        razorpay_order_id VARCHAR(255),
        razorpay_payment_id VARCHAR(255),
        razorpay_signature VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    tableChecked = true;
  } catch (e) { console.error('Payments table check:', e.message); }
}

// POST /api/payments/create-order — Create Razorpay order
exports.createOrder = async (req, res) => {
  try {
    const Razorpay = require('razorpay');
    const { gig_id, amount, worker_id, description } = req.body;
    const employerId = req.user.id;

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ message: 'Payment system not configured' });
    }

    if (!amount || amount < 1) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: `gig_${gig_id}_${Date.now()}`,
    });

    await ensureTable();
    await pool.query(
      `INSERT INTO payments (gig_id, employer_id, worker_id, amount, status, razorpay_order_id, description)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
      [gig_id || null, employerId, worker_id || null, amount, order.id, description || null]
    );

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Create order error:', err.message);
    res.status(500).json({ message: 'Payment order failed' });
  }
};

// POST /api/payments/verify — Verify Razorpay payment signature
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment details' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    await ensureTable();
    await pool.query(
      `UPDATE payments SET status = 'escrow', razorpay_payment_id = $1, razorpay_signature = $2, updated_at = NOW()
       WHERE razorpay_order_id = $3`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );

    res.json({ message: 'Payment verified and held in escrow' });
  } catch (err) {
    console.error('Verify payment error:', err.message);
    res.status(500).json({ message: 'Verification failed' });
  }
};

// POST /api/payments/release — Release escrow to worker
exports.releasePayment = async (req, res) => {
  try {
    const { payment_id } = req.body;
    await ensureTable();

    const check = await pool.query(
      'SELECT * FROM payments WHERE id = $1 AND employer_id = $2 AND status = \'escrow\'',
      [payment_id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Payment not found or not in escrow' });
    }

    await pool.query(
      'UPDATE payments SET status = \'released\', updated_at = NOW() WHERE id = $1',
      [payment_id]
    );

    res.json({ message: 'Payment released to worker' });
  } catch (err) {
    res.status(500).json({ message: 'Release failed' });
  }
};

// GET /api/payments/mine — Get user's payment history
exports.myPayments = async (req, res) => {
  try {
    await ensureTable();
    const result = await pool.query(
      `SELECT p.*, g.title AS gig_title,
              e.name AS employer_name, w.name AS worker_name
       FROM payments p
       LEFT JOIN gigs g ON p.gig_id = g.id
       LEFT JOIN users e ON p.employer_id = e.id
       LEFT JOIN users w ON p.worker_id = w.id
       WHERE p.employer_id = $1 OR p.worker_id = $1
       ORDER BY p.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.json([]);
  }
};
