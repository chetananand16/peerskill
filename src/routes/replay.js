const router = require('express').Router();
const { getDb } = require('../db');
const auth = require('../middleware/auth');

function safeParse(s){ try{ return JSON.parse(s);}catch{return s;} }

router.get('/my-sessions', auth, (req,res)=>{
  const db = getDb();
  db.all(`SELECT s.*, m.user_a, m.user_b
          FROM sessions s JOIN matches m ON s.match_id=m.id
          WHERE m.user_a=? OR m.user_b=? ORDER BY s.id DESC`, [req.user.id, req.user.id],
    (e,rows)=> e?res.status(500).json({error:e.message}):res.json(rows));
});

router.post('/:sessionId/consent', auth, (req,res)=>{
  const { allow } = req.body;
  const db = getDb();
  db.get(`SELECT s.*, m.user_a, m.user_b FROM sessions s JOIN matches m ON s.match_id=m.id WHERE s.id=?`, [req.params.sessionId], (e,sess)=>{
    if(e || !sess) return res.status(404).json({error:'session not found'});
    const setCol = (sess.user_a===req.user.id) ? 'consent_a' : (sess.user_b===req.user.id) ? 'consent_b' : null;
    if(!setCol) return res.status(403).json({error:'not your session'});
    db.run(`UPDATE sessions SET ${setCol}=? WHERE id=?`, [allow?1:0, sess.id], (err)=> err?res.status(500).json({error:err.message}):res.json({ok:true}));
  });
});

router.get('/:sessionId/events', auth, (req,res)=>{
  const db = getDb();
  db.get(`SELECT s.*, m.user_a, m.user_b FROM sessions s JOIN matches m ON s.match_id=m.id WHERE s.id=?`, [req.params.sessionId], (e,sess)=>{
    if(e || !sess) return res.status(404).json({error:'session not found'});
    if(!(sess.user_a===req.user.id || sess.user_b===req.user.id)) return res.status(403).json({error:'not your session'});
    if(!(sess.consent_a && sess.consent_b)) return res.status(403).json({error:'both participants must consent'});
    db.all('SELECT id, author_id, type, payload, created_at FROM session_events WHERE session_id=? ORDER BY id ASC', [sess.id], (err,rows)=>{
      if(err) return res.status(500).json({error:err.message});
      res.json(rows.map(r => ({...r, payload: safeParse(r.payload)})));
    });
  });
});

module.exports = router;
