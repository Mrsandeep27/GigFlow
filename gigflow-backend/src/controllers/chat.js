const pool = require('../config/db');

// GET /api/chat — List all conversations for current user
exports.listConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT c.id, c.gig_id, c.last_message_at,
              c.employer_unread, c.worker_unread,
              g.title AS gig_title,
              e.id AS employer_id, e.name AS employer_name, e.avatar_url AS employer_avatar,
              w.id AS worker_id, w.name AS worker_name, w.avatar_url AS worker_avatar,
              (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
       FROM conversations c
       JOIN users e ON c.employer_id = e.id
       JOIN users w ON c.worker_id = w.id
       LEFT JOIN gigs g ON c.gig_id = g.id
       WHERE c.employer_id = $1 OR c.worker_id = $1
       ORDER BY c.last_message_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('List conversations error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/chat — Start or get conversation
exports.startConversation = async (req, res) => {
  try {
    const { gig_id, other_user_id } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    // Determine employer/worker
    let employer_id, worker_id;
    if (role === 'employer') {
      employer_id = userId;
      worker_id = other_user_id;
    } else {
      worker_id = userId;
      employer_id = other_user_id;
    }

    // Check if conversation already exists
    const existing = await pool.query(
      `SELECT id FROM conversations
       WHERE employer_id = $1 AND worker_id = $2
       AND (gig_id = $3 OR ($3::int IS NULL AND gig_id IS NULL))`,
      [employer_id, worker_id, gig_id || null]
    );

    if (existing.rows.length > 0) {
      return res.json({ conversationId: existing.rows[0].id });
    }

    // Validate that worker applied to the gig (only allow chat after applying)
    if (gig_id) {
      const appCheck = await pool.query(
        'SELECT id FROM applications WHERE gig_id = $1 AND applicant_id = $2',
        [gig_id, worker_id]
      );
      if (appCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Chat is only available after applying to a job' });
      }
    }

    const result = await pool.query(
      `INSERT INTO conversations (gig_id, employer_id, worker_id)
       VALUES ($1,$2,$3) RETURNING id`,
      [gig_id || null, employer_id, worker_id]
    );

    res.status(201).json({ conversationId: result.rows[0].id });
  } catch (error) {
    console.error('Start conversation error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/chat/:id/messages — Get messages in a conversation
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { before, limit = 50 } = req.query;

    // Verify access
    const convRes = await pool.query(
      'SELECT * FROM conversations WHERE id = $1 AND (employer_id = $2 OR worker_id = $2)',
      [id, userId]
    );
    if (convRes.rows.length === 0) return res.status(404).json({ message: 'Conversation not found' });

    const conv = convRes.rows[0];

    let query = `
      SELECT m.id, m.content, m.is_read, m.created_at,
             u.id AS sender_id, u.name AS sender_name, u.avatar_url AS sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1`;
    const params = [id];

    if (before) {
      query += ` AND m.created_at < $${params.length + 1}`;
      params.push(before);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    // Mark unread messages as read
    await pool.query(
      'UPDATE messages SET is_read = true WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false',
      [id, userId]
    );

    // Reset unread count for current user
    const isEmployer = conv.employer_id === userId;
    await pool.query(
      `UPDATE conversations SET ${isEmployer ? 'employer_unread' : 'worker_unread'} = 0 WHERE id = $1`,
      [id]
    );

    res.json(result.rows.reverse()); // Return chronological order
  } catch (error) {
    console.error('Get messages error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/chat/:id/messages — Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    if (content.trim().length > 5000) {
      return res.status(400).json({ message: 'Message must be under 5,000 characters' });
    }

    // Verify access
    const convRes = await pool.query(
      'SELECT * FROM conversations WHERE id = $1 AND (employer_id = $2 OR worker_id = $2)',
      [id, userId]
    );
    if (convRes.rows.length === 0) return res.status(404).json({ message: 'Conversation not found' });

    const conv = convRes.rows[0];

    // Rate limit: max 10 messages per minute per conversation
    const recent = await pool.query(
      'SELECT COUNT(*) FROM messages WHERE conversation_id = $1 AND sender_id = $2 AND created_at > NOW() - INTERVAL \'1 minute\'',
      [id, userId]
    );
    if (parseInt(recent.rows[0].count) >= 10) {
      return res.status(429).json({ message: 'Too many messages. Please slow down.' });
    }

    const msgResult = await pool.query(
      'INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1,$2,$3) RETURNING id, created_at',
      [id, userId, content.trim()]
    );

    // Update conversation last_message_at and increment unread for other party
    const isEmployer = conv.employer_id === userId;
    await pool.query(
      `UPDATE conversations
       SET last_message_at = NOW(),
           ${isEmployer ? 'worker_unread' : 'employer_unread'} = ${isEmployer ? 'worker_unread' : 'employer_unread'} + 1
       WHERE id = $1`,
      [id]
    );

    // Notify recipient
    const recipientId = isEmployer ? conv.worker_id : conv.employer_id;
    const senderName = req.user.name || 'Someone';
    try {
      await pool.query(
        'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1,$2,$3,$4,$5)',
        [recipientId, 'new_message', 'New Message',
         `${senderName} sent you a message`, JSON.stringify({ conversation_id: id })]
      );
    } catch (_) {}

    res.status(201).json({
      id: msgResult.rows[0].id,
      content: content.trim(),
      created_at: msgResult.rows[0].created_at,
      sender_id: userId,
    });
  } catch (error) {
    console.error('Send message error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/chat/unread — Get total unread count
exports.unreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const result = await pool.query(
      `SELECT COALESCE(SUM(${role === 'employer' ? 'employer_unread' : 'worker_unread'}), 0) AS unread
       FROM conversations
       WHERE ${role === 'employer' ? 'employer_id' : 'worker_id'} = $1`,
      [userId]
    );

    res.json({ unread: parseInt(result.rows[0].unread) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
