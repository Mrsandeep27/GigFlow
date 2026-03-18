const app = require('./app');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('./config/db');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001',
].filter(Boolean);

const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? [process.env.CLIENT_URL].filter(Boolean)
      : allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ── Socket.IO authentication middleware ──────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// ── Socket.IO connection handling ────────────────────────────
io.on('connection', (socket) => {
  // Join user-specific room for targeted messages
  socket.join(`user:${socket.userId}`);

  socket.on('message', (data) => {
    if (!data || !data.recipientId || !data.content) return;
    // Send only to the intended recipient
    io.to(`user:${data.recipientId}`).emit('message', {
      content: data.content,
      senderId: socket.userId,
      conversationId: data.conversationId,
      createdAt: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {});
});

server.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});

// ── Graceful shutdown ────────────────────────────────────────
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    pool.end().then(() => {
      console.log('✓ Database pool closed');
      process.exit(0);
    }).catch(() => process.exit(1));
  });
  // Force exit after 10s
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
