const requireOwner = (req, res, next) => {
  if (!req.user || !['owner', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Owner access required' });
  }
  return next();
};

module.exports = requireOwner;
