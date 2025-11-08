const router = require('express').Router();
const { getDb } = require('../db');
const auth = require('../middleware/auth');

router.post('/', auth, (req,res)=>{
  const { match_id, to_user, rating, comment } = req.body;
  const db = getDb();
  db.run('INSERT INTO reviews (match_id, from_user, to_user, rating, comment) VALUES (?,?,?,?,?)',
    [match_id, req.user.id, to_user, rating, comment||null], function(err){
      if(err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID });
    });
});

router.get('/trust-score/:userId', (req,res)=>{
  const db = getDb();
  db.get('SELECT AVG(rating) as trust_score, COUNT(*) as reviews FROM reviews WHERE to_user=?', [req.params.userId], (e,row)=>{
    if(e) return res.status(500).json({ error: e.message });
    res.json({ trust_score: row?.trust_score || 0, reviews: row?.reviews || 0 });
  });
});

module.exports = router;
