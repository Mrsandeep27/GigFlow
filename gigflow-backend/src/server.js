const app = require('./app');
const http = require('http');
const socketIo = require('socket.io');
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
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('✓ New client connected:', socket.id);

  // Listen for messages
  socket.on('message', (data) => {
    console.log('Message received:', data);
    io.emit('message', data);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('✗ Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
