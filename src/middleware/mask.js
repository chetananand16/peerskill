const { getDb } = require('../db');

function fetchAnon(userId){
  const db = getDb();
  return new Promise((resolve) => {
    db.get('SELECT * FROM anonymity_prefs WHERE user_id=?', [userId], (e,row)=> resolve(row||{ is_anonymous:0 }));
  });
}

async function maskUserView(viewingUserId, person){
  const anon = await fetchAnon(person.id);
  if(anon?.is_anonymous){
    return {
      id: person.id,
      name: anon.pseudonym || `Learner-${String(person.id).padStart(4,'0')}`,
      avatar: `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(anon.avatar_seed||('user'+person.id))}`,
      anonymous: true
    };
  }
  return {
    id: person.id,
    name: person.name || person.email?.split('@')[0] || `User${person.id}`,
    avatar: null,
    anonymous: false
  };
}

module.exports = { maskUserView };
