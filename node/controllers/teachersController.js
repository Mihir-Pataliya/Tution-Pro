const mongoose = require('mongoose');
const User = require('../models/User');

const buildTenantFilter = (req) => ({ role: 'teacher', ...(req.user.role === 'owner' ? { ownerId: req.user.id } : {}) });

const listTeachers = async (req, res) => {
  try {
    const filter = buildTenantFilter(req);
    const teachers = await User.find(filter)
      .select('name email phone subject batchIds ownerId monthlySalary isActive createdAt lastLogin')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: teachers });
  } catch (err) {
    console.error('listTeachers error:', err);
    res.status(500).json({ message: 'Failed to fetch teachers' });
  }
};

module.exports = { listTeachers };
