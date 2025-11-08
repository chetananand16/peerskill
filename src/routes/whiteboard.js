const router = require('express').Router();
const { getDb } = require('../db');
const auth = require('../middleware/auth');

router.get('/:matchId', auth, (req,res)=>{
  const db = getDb();
  db.all('SELECT * FROM whiteboard WHERE match_id = ? ORDER BY id ASC', [req.params.matchId], (e,rows)=>{
    if(e) return res.status(500).json({ error: e.message });
    res.json(rows);
  });
});

router.post('/:matchId', auth, (req,res)=>{
  const { type, content } = req.body;
  const db = getDb();
  db.run('INSERT INTO whiteboard (match_id, author_id, type, content) VALUES (?,?,?,?)', [req.params.matchId, req.user.id, type||'text', content||''], function(err){
    if(err) return res.status(500).json({ error: err.message });
    const saved = { id: this.lastID };
    db.get('SELECT id FROM sessions WHERE match_id=? ORDER BY id DESC LIMIT 1', [req.params.matchId], (e,row)=>{
      if(row){
        db.run('INSERT INTO session_events (session_id, author_id, type, payload) VALUES (?,?,?,?)', [row.id, req.user.id, 'whiteboard', JSON.stringify({ type: type||"text", content: content||"" })]);
      }
      res.status(201).json(saved);
    });
  });
});

module.exports = router;
