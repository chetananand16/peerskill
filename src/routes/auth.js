const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');

router.post('/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  const hash = bcrypt.hashSync(password, 10);
  const db = getDb();
  db.run('INSERT INTO users (name, email, password_hash) VALUES (?,?,?)', [name || null, email, hash], function (err) {
    if (err) return res.status(400).json({ error: 'Email already in use' });
    const token = jwt.sign({ id: this.lastID, email }, process.env.JWT_SECRET || 'dev');
    res.status(201).json({ id: this.lastID, name, email, token });
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const db = getDb();
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET || 'dev');
    res.json({ id: user.id, name: user.name, email: user.email, token });
  });
});

module.exports = router;
