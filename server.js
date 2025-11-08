require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const { initDb } = require('./src/db');
const apiKey = require('./src/middleware/apikey');

// --- 1. NEW IMPORTS ---
const http = require('http'); // Import Node's built-in HTTP server
const { Server } = require("socket.io"); // Import socket.io

const app = express();
const PORT = process.env.PORT || 3000;

// --- HELMET & CORS MIDDLEWARE (Unchanged) ---
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      // === THIS IS THE FIXED LINE ===
      "script-src": ["'self'", "cdn.tailwindcss.com", "unpkg.com", "cdn.socket.io", "'unsafe-inline'"],
      "style-src": ["'self'", "fonts.googleapis.com", "'unsafe-inline'"],
      "font-src": ["'self'", "fonts.googleapis.com", "fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "images.unsplash.com", "placehold.co"],
      // === THIS IS THE FIXED LINE ===
      "connect-src": ["'self'", "unpkg.com", "cdn.socket.io"], 
      "script-src-attr": ["'unsafe-inline'"],
    },
  })
);
app.use(cors({ origin: (process.env.CORS_ORIGIN?.split(',') || true), credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

initDb();

app.use(express.static(path.join(__dirname, 'public')));

// --- API ROUTES (Unchanged) ---
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/profile', require('./src/routes/profile'));
app.use('/api/match', require('./src/routes/match'));
app.use('/api/chat', require('./src/routes/chat'));
app.use('/api/whiteboard', require('./src/routes/whiteboard'));
app.use('/api/review', require('./src/routes/review'));
app.use('/api/schedule', require('./src/routes/schedule'));
app.use('/api/privacy', require('./src/routes/privacy'));
app.use('/api/replay', require('./src/routes/replay'));
app.delete('/api/admin/wipe', apiKey, (req, res) => {
  // ... (admin wipe code is unchanged)
  const { getDb } = require('./src/db');
  const db = getDb();
  db.serialize(() => {
    db.run('DELETE FROM users');
    db.run('DELETE FROM profiles');
    db.run('DELETE FROM matches');
    db.run('DELETE FROM messages');
    db.run('DELETE FROM whiteboard');
    db.run('DELETE FROM reviews');
    db.run('DELETE FROM anonymity_prefs');
    db.run('DELETE FROM sessions');
    db.run('DELETE FROM session_events');
    res.json({ ok: true });
  });
});
app.use((req, res) => res.status(404).json({ error: 'Not found' }));


// --- 2. CREATE HTTP SERVER & SOCKET.IO SERVER ---
const server = http.createServer(app); // Create an HTTP server from our Express app
const io = new Server(server, {         // Attach socket.io to the HTTP server
  cors: {
    origin: "*", // Allow all origins for simplicity
    methods: ["GET", "POST"]
  }
});

// --- 3. ADD SOCKET.IO LOGIC ---
io.on('connection', (socket) => {
  console.log('A user connected with socket ID:', socket.id);

  // When this user sends a 'chat message'
  socket.on('chat message', (msg) => {
    // We send it back out to *everyone*
    // In a real app, you'd send this only to a specific "room"
    io.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});


// --- FINAL STEP: Listen on the new 'server' ---
// We start the new 'server' (which includes Express & socket.io)
// instead of the old 'app'.
server.listen(PORT, () => console.log(`Server (with WebSockets) → http://localhost:${PORT}`));