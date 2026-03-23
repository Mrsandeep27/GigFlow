const pool = require('../config/db');

// GET /api/portfolio/mine — Get current user's portfolio
exports.getMyPortfolio = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, type, url, thumbnail_url, tags, order_num, created_at
       FROM portfolio_items
       WHERE user_id = $1
       ORDER BY order_num ASC, created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get my portfolio error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/portfolio/:userId — Get user's portfolio
exports.getUserPortfolio = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT id, title, description, type, url, thumbnail_url, tags, order_num, created_at
       FROM portfolio_items
       WHERE user_id = $1
       ORDER BY order_num ASC, created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get portfolio error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/portfolio — Add portfolio item
exports.addItem = async (req, res) => {
  try {
    const { title, description, type, url, thumbnail_url, tags } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Get current max order_num
    const orderRes = await pool.query(
      'SELECT COALESCE(MAX(order_num), -1) AS max_order FROM portfolio_items WHERE user_id = $1',
      [userId]
    );
    const nextOrder = orderRes.rows[0].max_order + 1;

    const result = await pool.query(
      `INSERT INTO portfolio_items (user_id, title, description, type, url, thumbnail_url, tags, order_num)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        userId, title.trim(), description || null,
        type || 'project', url || null, thumbnail_url || null,
        tags || null, nextOrder,
      ]
    );

    res.status(201).json({ message: 'Portfolio item added', itemId: result.rows[0].id });
  } catch (error) {
    console.error('Add portfolio error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/portfolio/:id — Update portfolio item
exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, url, thumbnail_url, tags, order_num } = req.body;
    const userId = req.user.id;

    const check = await pool.query('SELECT user_id FROM portfolio_items WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    if (check.rows[0].user_id !== userId) return res.status(403).json({ message: 'Not authorized' });

    await pool.query(
      `UPDATE portfolio_items
       SET title=$1, description=$2, type=$3, url=$4, thumbnail_url=$5, tags=$6,
           order_num=$7, updated_at=NOW()
       WHERE id=$8`,
      [title, description || null, type || 'project', url || null,
       thumbnail_url || null, tags || null, order_num ?? 0, id]
    );

    res.json({ message: 'Portfolio item updated' });
  } catch (error) {
    console.error('Update portfolio error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/portfolio/:id — Delete portfolio item
exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT user_id FROM portfolio_items WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    await pool.query('DELETE FROM portfolio_items WHERE id = $1', [id]);
    res.json({ message: 'Portfolio item deleted' });
  } catch (error) {
    console.error('Delete portfolio error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
