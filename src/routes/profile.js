const router = require('express').Router();
const { getDb } = require('../db');
const auth = require('../middleware/auth');

router.post('/', auth, (req, res) => {
  const { offer, offer_level, want, want_level, timezone } = req.body;
  const db = getDb();
  db.run(`INSERT INTO profiles (user_id, offer, offer_level, want, want_level, timezone)
          VALUES (?,?,?,?,?,?)
          ON CONFLICT(user_id) DO UPDATE SET
            offer=excluded.offer, offer_level=excluded.offer_level,
            want=excluded.want, want_level=excluded.want_level,
            timezone=excluded.timezone, updated_at=CURRENT_TIMESTAMP`,
    [req.user.id, offer, offer_level, want, want_level, timezone],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    });
});

router.get('/me', auth, (req, res) => {
  const db = getDb();
  db.get('SELECT * FROM profiles WHERE user_id = ?', [req.user.id], (e, row) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json(row || null);
  });
});

module.exports = router;
