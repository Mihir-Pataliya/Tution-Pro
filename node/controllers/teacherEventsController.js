const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');

const getTeacherEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role ownerId batchIds').lean();
    const academyId = user.role === 'owner' ? user._id : user.ownerId;
    const teacherId = req.user.id;
    const teacherBatches = (user.batchIds || []).map(String);

    const events = await Event.find({ academyId, status: 'published' }).sort({ startDate: 1 }).lean();
    const filtered = events.filter((e) => {
      if (e.audience === 'academy') return true;
      if (e.audience === 'batches') return (e.batchIds || []).some((b) => teacherBatches.includes(String(b)));
      if (e.audience === 'teachers') return (e.teacherIds || []).some((t) => String(t) === String(teacherId));
      return false; // students
    });
    // dedup
    const seen = new Set();
    const unique = filtered.filter((e) => { if (seen.has(String(e._id))) return false; seen.add(String(e._id)); return true; });
    res.json({ success: true, data: unique });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to fetch teacher events' }); }
};

module.exports = { getTeacherEvents };
