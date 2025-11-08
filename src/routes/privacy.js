const router = require('express').Router();
const auth = require('../middleware/auth');
const { getDb } = require('../db');

// GET route to fetch current anonymity setting
router.get('/', auth, (req, res) => {
  const db = getDb();
  db.get(
    'SELECT is_anonymous FROM anonymity_prefs WHERE user_id = ?',
    [req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      // If no setting found, default to false
      res.json({ is_anonymous: row ? row.is_anonymous : false });
    }
  );
});

// POST route to update anonymity setting
router.post('/', auth, (req, res) => {
  const { is_anonymous } = req.body; // e.g., true or false
  const db = getDb();
  
  db.run(
    'INSERT OR REPLACE INTO anonymity_prefs (user_id, is_anonymous) VALUES (?, ?)',
    [req.user.id, is_anonymous],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, is_anonymous });
    }
  );
});

module.exports = router;