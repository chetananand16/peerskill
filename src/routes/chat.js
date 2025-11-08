const router = require('express').Router();
const { getDb } = require('../db');
const auth = require('../middleware/auth');

router.get('/:matchId', auth, (req,res)=>{
  const db = getDb();
  db.all('SELECT * FROM messages WHERE match_id = ? ORDER BY id ASC', [req.params.matchId], (e,rows)=>{
    if(e) return res.status(500).json({ error: e.message });
    res.json(rows);
  });
});

router.post('/:matchId', auth, (req,res)=>{
  const { text } = req.body;
  const db = getDb();
  db.run('INSERT INTO messages (match_id, sender_id, text) VALUES (?,?,?)', [req.params.matchId, req.user.id, text], function(err){
    if(err) return res.status(500).json({ error: err.message });
    const saved = { id: this.lastID, match_id: +req.params.matchId, sender_id: req.user.id, text };
    db.get('SELECT id FROM sessions WHERE match_id=? ORDER BY id DESC LIMIT 1', [req.params.matchId], (e,row)=>{
      if(row){
        db.run('INSERT INTO session_events (session_id, author_id, type, payload) VALUES (?,?,?,?)', [row.id, req.user.id, 'chat', JSON.stringify({ text })]);
      }
      res.status(201).json(saved);
    });
  });
});

module.exports = router;
