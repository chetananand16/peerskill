const router = require('express').Router();
const { getDb } = require('../db');
const auth = require('../middleware/auth');
const { maskUserView } = require('../middleware/mask');

function norm(s){ return (s||'').toLowerCase().trim(); }
function levelScore(a,b){
  const order = ['beginner','intermediate','advanced','expert'];
  const da = order.indexOf((a||'intermediate').toLowerCase());
  const dbi = order.indexOf((b||'intermediate').toLowerCase());
  return 1 - (Math.abs(da-dbi)/ (order.length-1));
}

router.get('/suggest', auth, (req, res) => {
  const db = getDb();
  db.get('SELECT * FROM profiles WHERE user_id=?', [req.user.id], (e, me) => {
    if (e || !me) return res.status(400).json({ error: 'complete profile first' });
    db.all('SELECT u.id as id, u.name, p.* FROM users u JOIN profiles p ON u.id=p.user_id WHERE u.id <> ?', [req.user.id], async (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const want = norm(me.want), offer = norm(me.offer);
      const scored = await Promise.all(rows.map(async r => {
        const theirOffer = norm(r.offer), theirWant = norm(r.want);
        const offerMatch = theirWant.includes(offer) ? 1 : 0;
        const wantMatch = theirOffer.includes(want) ? 1 : 0;
        const score = 0.5*offerMatch + 0.5*wantMatch
          + 0.25*levelScore(me.offer_level, r.want_level)
          + 0.25*levelScore(me.want_level, r.offer_level);
        const masked = await maskUserView(req.user.id, { id: r.user_id, name: r.name });
        return { user_id: r.user_id, name: masked.name, avatar: masked.avatar, anonymous: masked.anonymous, offer: r.offer, want: r.want, timezone: r.timezone, score: +score.toFixed(3) };
      }));
      res.json(scored.filter(x=>x.score>0.3).sort((a,b)=>b.score-a.score).slice(0,10));
    });
  });
});

router.post('/:partnerId/accept', auth, (req,res)=>{
  const partnerId = +req.params.partnerId;
  const db = getDb();
  db.get(`SELECT * FROM matches WHERE (user_a=? AND user_b=?) OR (user_a=? AND user_b=?)`,
    [req.user.id, partnerId, partnerId, req.user.id], (e, match) => {
      if (e) return res.status(500).json({ error: e.message });
      const createSession = (matchId) => {
        db.run('INSERT INTO sessions (match_id) VALUES (?)', [matchId], function(err){
          if (err) return res.status(500).json({ error: err.message });
          res.status(201).json({ id: matchId, session_id: this.lastID, user_a: req.user.id, user_b: partnerId, status: 'accepted' });
        });
      };
      if (match) return createSession(match.id);
      db.run('INSERT INTO matches (user_a, user_b, score, status) VALUES (?,?,?,?)',
        [req.user.id, partnerId, 1.0, 'accepted'], function(err){
          if (err) return res.status(500).json({ error: err.message });
          createSession(this.lastID);
        });
    });
});

module.exports = router;
