module.exports = (req, res, next) => {
  const expected = process.env.API_KEY;
  if (!expected) return next();
  const provided = req.get('x-api-key');
  if (provided && provided === expected) return next();
  return res.status(401).json({ error: 'Invalid API key' });
};
