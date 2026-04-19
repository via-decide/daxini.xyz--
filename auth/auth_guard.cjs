const { verifyToken } = require('./jwt_manager.cjs');

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  return scheme === 'Bearer' ? token : null;
}

function authGuard(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ message: 'Missing bearer token.' });

  try {
    const payload = verifyToken(token);
    req.authUser = { userId: payload.userId, username: payload.username };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function verifyPassportToken(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ message: 'Missing bearer token.' });

  try {
    req.authPassport = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid passport token.' });
  }
}

module.exports = { authGuard, verifyPassportToken };
