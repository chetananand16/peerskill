const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
  const token = req.get('authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev');
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Bad token' });
  }
};
