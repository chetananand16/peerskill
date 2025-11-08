const router = require('express').Router();
const auth = require('../middleware/auth');

router.post('/propose', auth, (req,res)=>{
  const { partner_id } = req.body || {};
  const start = new Date(Date.now()+60*60*1000).toISOString();
  res.json({ partner_id, proposed_start_iso: start, duration_minutes: 60, meeting_link: 'https://meet.jit.si/skillswap-'+Math.random().toString(36).slice(2,8) });
});

module.exports = router;
