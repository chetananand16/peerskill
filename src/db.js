const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Check for the Render environment variable and use the persistent disk path
const DB_DIR = process.env.RENDER_DISK_MOUNT_PATH || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'skillswap.db');
// Ensure the database directory exists locally (Render creates it automatically)
// NOTE: We don't need fs.mkdirSync here as it will be run in initDb

let db;

function initDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new sqlite3.Database(DB_PATH);
  
  db.serialize(() => {
    // 1. Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password_hash TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Profiles table
    db.run(`CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY,
      offer TEXT NOT NULL,
      offer_level TEXT,
      want TEXT NOT NULL,
      want_level TEXT,
      timezone TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 3. Matches table
    db.run(`CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_a INTEGER,
      user_b INTEGER,
      score REAL,
      status TEXT DEFAULT 'proposed',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // 4. Messages table
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER,
      sender_id INTEGER,
      text TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // 5. Whiteboard table (for old system)
    db.run(`CREATE TABLE IF NOT EXISTS whiteboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER,
      author_id INTEGER,
      type TEXT,
      content TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // 6. Reviews table
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER,
      from_user INTEGER,
      to_user INTEGER,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // 7. Anonymity table (This was the one with the syntax error)
    db.run(`CREATE TABLE IF NOT EXISTS anonymity_prefs (
      user_id INTEGER PRIMARY KEY,
      is_anonymous INTEGER DEFAULT 0,
      pseudonym TEXT,
      avatar_seed TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 8. Sessions table (This was the duplicate)
    //    We are merging the two versions into one.
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        user_a INTEGER NOT NULL,
        user_b INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TEXT,
        consent_a INTEGER DEFAULT 0,
        consent_b INTEGER DEFAULT 0,
        FOREIGN KEY (match_id) REFERENCES matches(id),
        FOREIGN KEY (user_a) REFERENCES users(id),
        FOREIGN KEY (user_b) REFERENCES users(id)
      )
    `);

    // 9. Session Replays table
    //    (Removed redundant consent fields, as they are in the 'sessions' table)
    db.run(`
      CREATE TABLE IF NOT EXISTS session_replays (
        session_id INTEGER PRIMARY KEY,
        chat_log TEXT,
        whiteboard_data TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // 10. Session Events table
    db.run(`CREATE TABLE IF NOT EXISTS session_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      author_id INTEGER,
      type TEXT,
      payload TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

function getDb(){ if(!db) initDb(); return db; }

module.exports = { initDb, getDb };
