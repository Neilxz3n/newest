const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const jwtConfig = require('./config/jwt');
const notificationService = require('./services/notification.service');

require('dotenv').config();

const db = require('./config/database');

const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
if (!tableCheck) {
  const schemaPath = path.join(__dirname, 'database/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
  }
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
});

notificationService.setSocketIO(io);

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

const authRoutes = require('./routes/auth.routes');
const itemsRoutes = require('./routes/items.routes');
const claimsRoutes = require('./routes/claims.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationsRoutes = require('./routes/notifications.routes');

app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user_${socket.userId}`);
  console.log(`User ${socket.userId} connected via WebSocket`);

  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  res.status(500).json({ message: 'Internal server error.' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
