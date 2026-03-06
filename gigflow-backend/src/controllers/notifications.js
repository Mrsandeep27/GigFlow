const pool = require('../config/db');

// Get my notifications
exports.getNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unreadCount = result.rows.filter(n => !n.is_read).length;
    res.json({ notifications: result.rows, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark one as read
exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark read error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark all as read
exports.markAllRead = async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ message: 'All marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
