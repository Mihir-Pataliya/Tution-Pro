const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const [scheme, token] = authorization?.split(' ') || [];

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Authentication is not configured' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired authentication token' });
  }

  if (!payload.id) return res.status(401).json({ message: 'Invalid authentication token' });
  try {
    const user = await User.findById(payload.id).select('+authVersion isActive email role');
    if (!user || !user.isActive || (payload.authVersion || 0) !== (user.authVersion || 0)) {
      return res.status(401).json({ message: 'Your session is no longer valid. Please sign in again.' });
    }
    req.user = { id: user._id.toString(), email: user.email, role: user.role };
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = requireAuth;
