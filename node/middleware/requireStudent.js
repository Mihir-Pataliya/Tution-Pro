const requireStudent = (req, res, next) => {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ message: 'Student access required' });
  }
  return next();
};

module.exports = requireStudent;