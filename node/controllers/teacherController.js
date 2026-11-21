const mongoose = require('mongoose');
const User = require('../models/User');
const Batch = require('../models/Batch');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const StudyMaterial = require('../models/StudyMaterial');
const Message = require('../models/Message');

async function getScope(req) {
  const user = await User.findById(req.user.id).select('name email phone role tuitionName subject batchIds ownerId isActive');
  if (!user || !user.isActive) return null;
  let ownerId = req.user.id;
  let allowedBatchIds = null;
  if (user.role === 'teacher') {
    ownerId = user.ownerId ? String(user.ownerId) : null;
    allowedBatchIds = (user.batchIds || []).map((id) => String(id));
  }
  return { user, ownerId, allowedBatchIds };
}

function batchScopeFilter(ownerId, allowedBatchIds, extra) {
  const filter = { userId: ownerId, ...(extra || {}) };
  if (allowedBatchIds) filter._id = { $in: allowedBatchIds };
  return filter;
}

const getProfile = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope) return res.status(401).json({ message: 'Account unavailable' });
    const { user, ownerId } = scope;
    let owner = null;
    if (user.role === 'teacher' && ownerId) owner = await User.findById(ownerId).select('tuitionName name').lean();
    res.json({ success: true, data: { user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, subject: user.subject, tuitionName: user.tuitionName, ownerId, academy: owner ? (owner.tuitionName || owner.name) : user.tuitionName, batchIds: user.batchIds || [] } } });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to load profile' }); }
};

const updateProfile = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope) return res.status(401).json({ message: 'Account unavailable' });
    const { name, phone, subject } = req.body || {};
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ message: 'Name is required.' });
    if (typeof phone !== 'string' || !/^[+\\d().\\-\\s]{7,30}$/.test(phone.trim()) || !/\\d/.test(phone)) return res.status(400).json({ message: 'Enter a valid phone number.' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Account not found' });
    user.name = name.trim();
    user.phone = phone.trim();
    if (typeof subject === 'string') user.subject = subject.trim().slice(0, 120);
    await user.save();
    res.json({ success: true, message: 'Profile updated.', data: { name: user.name, phone: user.phone, subject: user.subject } });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to update profile' }); }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) return res.status(400).json({ message: 'Enter your current password and a new password of 8 to 128 characters.' });
    const user = await User.findById(req.user.id).select('+password +authVersion');
    if (!user) return res.status(404).json({ message: 'Account not found' });
    const bcrypt = require('bcryptjs');
    if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(400).json({ message: 'Current password is incorrect.' });
    if (currentPassword === newPassword) return res.status(400).json({ message: 'Choose a new password that differs from your current password.' });
    user.password = newPassword;
    user.authVersion = (user.authVersion || 0) + 1;
    await user.save();
    res.json({ success: true, message: 'Password changed.', data: { token: user.generateAuthToken() } });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to change password' }); }
};

const getOverview = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Teacher account is not linked to an academy.' });
    const { ownerId, allowedBatchIds } = scope;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const tomorrow = new Date(todayStart.getTime() + 86400000);
    const batchQuery = batchScopeFilter(ownerId, allowedBatchIds);
    const [batches, students, todayAttendance] = await Promise.all([
      Batch.find(batchQuery).lean(),
      Student.find(allowedBatchIds ? { userId: ownerId, batchId: { $in: allowedBatchIds }, isActive: true } : { userId: ownerId, isActive: true }).lean(),
      Attendance.find(allowedBatchIds ? { userId: ownerId, batchId: { $in: allowedBatchIds }, date: { $gte: todayStart, $lt: tomorrow } } : { userId: ownerId, date: { $gte: todayStart, $lt: tomorrow } }).lean(),
    ]);
    const studentCounts = await Student.aggregate([
      { $match: allowedBatchIds ? { userId: new mongoose.Types.ObjectId(ownerId), batchId: { $in: allowedBatchIds.map((id) => new mongoose.Types.ObjectId(id)) }, isActive: true } : { userId: new mongoose.Types.ObjectId(ownerId), isActive: true } },
      { $group: { _id: '$batchId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(studentCounts.map((r) => [String(r._id), r.count]));

    const presentToday = todayAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
    const absentToday = todayAttendance.filter((a) => a.status === 'absent').length;
    const recentAssignments = await Assignment.find({ teacherId: req.user.id }).sort({ createdAt: -1 }).limit(5).lean();
    const recentMaterials = await StudyMaterial.find({ teacherId: req.user.id }).sort({ createdAt: -1 }).limit(5).lean();
    const recentMessages = await Message.find({ $or: [{ senderId: req.user.id }, { recipientId: req.user.id }] }).sort({ createdAt: -1 }).limit(5).lean();
    const pendingAssignments = await Assignment.countDocuments({ teacherId: req.user.id, status: { $ne: 'closed' } });
    const recentActivity = [
      ...recentAssignments.map((a) => ({ type: 'assignment', title: `Assignment: ${a.title}`, at: a.createdAt })),
      ...recentMaterials.map((m) => ({ type: 'material', title: `Material: ${m.title}`, at: m.createdAt })),
      ...recentMessages.map((m) => ({ type: 'message', title: `Message: ${String(m.content).slice(0, 60)}`, at: m.createdAt })),
    ].sort((a,b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
    res.json({ success: true, data: {
      stats: { assignedBatches: batches.length, assignedStudents: students.length, presentToday, absentToday, totalAttendanceToday: todayAttendance.length, pendingAssignments },
      batches: batches.map((b) => ({ id: String(b._id), name: b.name, subject: b.subject, timing: b.timings || b.timing || '', days: b.days || [], maxStudents: b.maxStudents, studentCount: countMap.get(String(b._id)) || 0 })),
      recentActivity,
    } });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to load overview' }); }
};

const getBatches = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Teacher account is not linked to an academy.' });
    const { ownerId, allowedBatchIds } = scope;
    const batches = await Batch.find(batchScopeFilter(ownerId, allowedBatchIds)).sort({ name: 1 }).lean();
    const studentCounts = await Student.aggregate([
      { $match: allowedBatchIds ? { userId: new mongoose.Types.ObjectId(ownerId), batchId: { $in: allowedBatchIds.map((id) => new mongoose.Types.ObjectId(id)) }, isActive: true } : { userId: new mongoose.Types.ObjectId(ownerId), isActive: true } },
      { $group: { _id: '$batchId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(studentCounts.map((r) => [String(r._id), r.count]));
    res.json({ success: true, data: batches.map((b) => ({ id: String(b._id), _id: b._id, name: b.name, subject: b.subject || '', timing: b.timings || b.timing || '', timings: b.timings || '', days: b.days || [], maxStudents: b.maxStudents || 30, studentCount: countMap.get(String(b._id)) || 0 })) });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to load classes' }); }
};

const getStudents = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Teacher account is not linked to an academy.' });
    const { ownerId, allowedBatchIds } = scope;
    const filter = { userId: ownerId };
    if (allowedBatchIds) filter.batchId = { $in: allowedBatchIds };
    if (req.query.batchId) {
      if (allowedBatchIds && !allowedBatchIds.includes(String(req.query.batchId))) return res.status(403).json({ message: 'You are not assigned to this batch' });
      filter.batchId = req.query.batchId;
    }
    const students = await Student.find(filter).populate({ path: 'batchId', select: 'name timings' }).sort({ name: 1 }).lean();
    res.json({ success: true, data: students.map((s) => ({ id: String(s._id), _id: s._id, name: s.name, age: s.age, parentName: s.parentName, parentPhone: s.parentPhone, monthlyFee: s.monthlyFee, batchId: s.batchId ? { _id: s.batchId._id, name: s.batchId.name, timing: s.batchId.timings } : null, isActive: s.isActive })) });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to load students' }); }
};

const getAttendance = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Teacher account is not linked to an academy.' });
    const { ownerId, allowedBatchIds } = scope;
    const { batchId } = req.query;
    if (!batchId || !mongoose.isValidObjectId(batchId)) return res.status(400).json({ message: 'Choose a valid batch' });
    if (allowedBatchIds && !allowedBatchIds.includes(String(batchId))) return res.status(403).json({ message: 'You are not assigned to this batch' });
    const batch = await Batch.findOne({ _id: batchId, userId: ownerId }).lean();
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    const students = await Student.find({ userId: ownerId, batchId, isActive: true }).select('name').sort({ name: 1 }).lean();
    const start = new Date(); start.setHours(0,0,0,0);
    const attendance = await Attendance.find({ userId: ownerId, batchId, date: { $gte: start, $lt: new Date(start.getTime() + 86400000) } }).select('studentId status').lean();
    const records = new Map(attendance.map((r) => [String(r.studentId), r.status]));
    res.json({ success: true, data: { batch: { id: String(batch._id), name: batch.name }, students: students.map((s) => ({ id: String(s._id), name: s.name, status: records.get(String(s._id)) || '' })) } });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to load attendance' }); }
};

const markAttendance = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Teacher account is not linked to an academy.' });
    const { ownerId, allowedBatchIds } = scope;
    const { batchId, records } = req.body || {};
    if (!mongoose.isValidObjectId(batchId) || !Array.isArray(records)) return res.status(400).json({ message: 'Batch and attendance records are required' });
    if (records.length > 200) return res.status(400).json({ message: 'Too many attendance records' });
    if (allowedBatchIds && !allowedBatchIds.includes(String(batchId))) return res.status(403).json({ message: 'You are not assigned to this batch' });
    const batch = await Batch.findOne({ _id: batchId, userId: ownerId });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    const studentIds = [...new Set(records.map((r) => String(r.studentId)))];
    if (studentIds.some((id) => !mongoose.isValidObjectId(id))) return res.status(400).json({ message: 'Invalid student in attendance records' });
    const ownedStudents = await Student.find({ _id: { $in: studentIds }, userId: ownerId, batchId, isActive: true }).select('_id').lean();
    if (ownedStudents.length !== studentIds.length) return res.status(400).json({ message: 'One or more students do not belong to this batch' });
    const allowed = new Set(['present', 'absent', 'late']);
    if (records.some((r) => !allowed.has(r.status))) return res.status(400).json({ message: 'Attendance status must be present, absent, or late' });
    const date = new Date(); date.setHours(0,0,0,0);
    await Promise.all(records.map(({ studentId, status }) => Attendance.findOneAndUpdate(
      { userId: ownerId, batchId, studentId, date: { $gte: date, $lt: new Date(date.getTime() + 86400000) } },
      { $set: { userId: ownerId, batchId, studentId, date, status } },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
    )));
    res.json({ success: true, message: 'Attendance saved', data: { saved: records.length } });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to save attendance' }); }
};

const getAssignments = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Teacher account is not linked to an academy.' });
    const { allowedBatchIds } = scope;
    const filter = { teacherId: req.user.id };
    if (req.query.batchId) {
      if (allowedBatchIds && !allowedBatchIds.includes(String(req.query.batchId))) return res.status(403).json({ message: 'You are not assigned to this batch' });
      filter.batchId = req.query.batchId;
    }
    if (allowedBatchIds && !filter.batchId) filter.batchId = { $in: allowedBatchIds };
    const items = await Assignment.find(filter).populate({ path: 'batchId', select: 'name' }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: items.map((a) => ({ id: String(a._id), _id: a._id, title: a.title, description: a.description, dueDate: a.dueDate, status: a.status, batchId: a.batchId ? { _id: a.batchId._id, name: a.batchId.name } : null, createdAt: a.createdAt })) });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to load assignments' }); }
};

const createAssignment = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Teacher account is not linked to an academy.' });
    const { ownerId, allowedBatchIds } = scope;
    const { title, description, batchId, dueDate, status } = req.body || {};
    if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ message: 'Assignment title is required.' });
    if (!batchId || !mongoose.isValidObjectId(batchId)) return res.status(400).json({ message: 'Choose a valid batch.' });
    if (allowedBatchIds && !allowedBatchIds.includes(String(batchId))) return res.status(403).json({ message: 'You are not assigned to this batch.' });
    const batch = await Batch.findOne({ _id: batchId, userId: ownerId });
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });
    const item = await Assignment.create({ ownerId, teacherId: req.user.id, batchId, title: title.trim(), description: typeof description === 'string' ? description.trim() : '', dueDate: dueDate ? new Date(dueDate) : null, status: status === 'closed' ? 'closed' : 'open' });
    res.status(201).json({ success: true, message: 'Assignment created.', data: { id: String(item._id), _id: item._id, title: item.title, description: item.description, dueDate: item.dueDate, status: item.status, batchId: { _id: batch._id, name: batch.name } } });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to create assignment' }); }
};

const updateAssignment = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Teacher account is not linked to an academy.' });
    const { ownerId, allowedBatchIds } = scope;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid assignment.' });
    const item = await Assignment.findOne({ _id: id, teacherId: req.user.id });
    if (!item) return res.status(404).json({ message: 'Assignment not found.' });
    const { title, description, batchId, dueDate, status } = req.body || {};
    if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ message: 'Assignment title is required.' });
    if (batchId && mongoose.isValidObjectId(batchId)) {
      if (allowedBatchIds && !allowedBatchIds.includes(String(batchId))) return res.status(403).json({ message: 'You are not assigned to this batch.' });
      const batch = await Batch.findOne({ _id: batchId, userId: ownerId });
      if (!batch) return res.status(404).json({ message: 'Batch not found.' });
      item.batchId = batchId;
    }
    item.title = title.trim();
    item.description = typeof description === 'string' ? description.trim() : item.description;
    item.dueDate = dueDate ? new Date(dueDate) : item.dueDate;
    if (status === 'open' || status === 'closed') item.status = status;
    await item.save();
    res.json({ success: true, message: 'Assignment updated.', data: { id: String(item._id), _id: item._id, title: item.title, description: item.description, dueDate: item.dueDate, status: item.status } });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to update assignment' }); }
};

const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid assignment.' });
    const item = await Assignment.findOneAndDelete({ _id: id, teacherId: req.user.id });
    if (!item) return res.status(404).json({ message: 'Assignment not found.' });
    res.json({ success: true, message: 'Assignment deleted.' });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to delete assignment' }); }
};

// Study materials
const getMaterials = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Teacher account is not linked to an academy.' });
    const { allowedBatchIds } = scope;
    const filter = { teacherId: req.user.id };
    if (req.query.batchId) {
      if (allowedBatchIds && !allowedBatchIds.includes(String(req.query.batchId))) return res.status(403).json({ message: 'You are not assigned to this batch' });
      filter.batchId = req.query.batchId;
    }
    if (allowedBatchIds && !filter.batchId) filter.batchId = { $in: allowedBatchIds };
    const items = await StudyMaterial.find(filter).populate({ path: 'batchId', select: 'name' }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: items.map((m) => ({ id: String(m._id), _id: m._id, title: m.title, description: m.description, type: m.type, url: m.url, batchId: m.batchId ? { _id: m.batchId._id, name: m.batchId.name } : null, createdAt: m.createdAt })) });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to load study materials' }); }
};

const createMaterial = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Teacher account is not linked to an academy.' });
    const { ownerId, allowedBatchIds } = scope;
    const { title, description, batchId, type, url } = req.body || {};
    if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ message: 'Material title is required.' });
    if (!batchId || !mongoose.isValidObjectId(batchId)) return res.status(400).json({ message: 'Choose a valid batch.' });
    if (allowedBatchIds && !allowedBatchIds.includes(String(batchId))) return res.status(403).json({ message: 'You are not assigned to this batch.' });
    const batch = await Batch.findOne({ _id: batchId, userId: ownerId });
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });
    const item = await StudyMaterial.create({ ownerId, teacherId: req.user.id, batchId, title: title.trim(), description: typeof description === 'string' ? description.trim() : '', type: ['link','note','file'].includes(type) ? type : 'link', url: typeof url === 'string' ? url.trim() : '' });
    res.status(201).json({ success: true, message: 'Study material added.', data: { id: String(item._id), _id: item._id, title: item.title, description: item.description, type: item.type, url: item.url, batchId: { _id: batch._id, name: batch.name } } });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to add study material' }); }
};

const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid material.' });
    const item = await StudyMaterial.findOneAndDelete({ _id: id, teacherId: req.user.id });
    if (!item) return res.status(404).json({ message: 'Study material not found.' });
    res.json({ success: true, message: 'Study material deleted.' });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to delete study material' }); }
};

// Messages
const getMessages = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Teacher account is not linked to an academy.' });
    const { ownerId } = scope;
    const items = await Message.find({ ownerId, $or: [{ senderId: req.user.id }, { recipientId: req.user.id }] }).populate({ path: 'senderId', select: 'name role' }).populate({ path: 'recipientId', select: 'name role' }).populate({ path: 'batchId', select: 'name' }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, data: items.map((m) => ({ id: String(m._id), _id: m._id, subject: m.subject, content: m.content, read: m.read, recipientType: m.recipientType, recipientName: m.recipientName, batchId: m.batchId ? { _id: m.batchId._id, name: m.batchId.name } : null, sender: m.senderId ? { id: String(m.senderId._id), name: m.senderId.name, role: m.senderId.role } : null, recipient: m.recipientId ? { id: String(m.recipientId._id || m.recipientId), name: m.recipientName || (m.recipientId?.name) || '—', role: m.recipientType || (m.recipientId?.role) } : (m.recipientName ? { id: String(m.recipientId), name: m.recipientName, role: m.recipientType } : null), createdAt: m.createdAt })) });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to load messages' }); }
};

const getRecipients = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Teacher account is not linked to an academy.' });
    const { ownerId, allowedBatchIds } = scope;
    const type = String(req.query.type || '').toLowerCase();
    let list = [];
    if (type === 'academy' || type === 'owner' || type === 'admin') {
      const owner = await User.findById(ownerId).select('name role email').lean();
      const admins = await User.find({ ownerId, role: 'admin', isActive: true }).select('name role email').lean();
      if (type === 'owner') list = owner ? [owner] : [];
      else if (type === 'admin') list = admins;
      else list = [owner, ...admins].filter(Boolean);
    } else if (type === 'teacher') {
      list = await User.find({ ownerId, role: 'teacher', isActive: true, _id: { $ne: req.user.id } }).select('name role email subject').lean();
    } else if (type === 'student') {
      const students = await Student.find(allowedBatchIds ? { userId: ownerId, batchId: { $in: allowedBatchIds }, isActive: true } : { userId: ownerId, isActive: true }).select('name batchId').populate({ path: 'batchId', select: 'name' }).lean();
      list = students.map((s) => ({ _id: s._id, name: s.name, role: 'student', batchName: s.batchId?.name || '' }));
    } else if (type === 'parent') {
      const students = await Student.find(allowedBatchIds ? { userId: ownerId, batchId: { $in: allowedBatchIds }, isActive: true } : { userId: ownerId, isActive: true }).select('name parentName parentPhone batchId').populate({ path: 'batchId', select: 'name' }).lean();
      const seen = new Set();
      list = [];
      for (const s of students) {
        const key = `${s.parentName || ''}|${s.parentPhone || ''}|${s._id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        list.push({ _id: s._id, name: `${s.parentName || 'Parent'} (of ${s.name})`, role: 'parent', phone: s.parentPhone || '', batchName: s.batchId?.name || '' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid recipient type.' });
    }
    res.json({ success: true, data: list.map((u) => ({ id: String(u._id), name: u.name, role: u.role, email: u.email, subject: u.subject, batchName: u.batchName, phone: u.phone })) });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to load recipients' }); }
};

const sendMessage = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Teacher account is not linked to an academy.' });
    const { ownerId, allowedBatchIds } = scope;
    const { content, subject, batchId, recipientType, recipientId } = req.body || {};
    if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ message: 'Message content is required.' });
    const type = String(recipientType || 'owner').toLowerCase();
    if (!['academy','owner','admin','teacher','student','parent'].includes(type)) return res.status(400).json({ message: 'Invalid recipient type.' });
    if (typeof recipientId !== 'string' || !recipientId.trim()) return res.status(400).json({ message: 'Recipient is required.' });

    let resolvedRecipientId = recipientId.trim();
    let recipientName = '';
    let resolvedBatch = null;
    if (batchId && mongoose.isValidObjectId(batchId)) resolvedBatch = batchId;

    if (type === 'owner' || type === 'admin' || type === 'teacher') {
      if (!mongoose.isValidObjectId(resolvedRecipientId)) return res.status(400).json({ message: 'Invalid recipient.' });
      const recipient = await User.findOne({ _id: resolvedRecipientId, isActive: true });
      if (!recipient) return res.status(404).json({ message: 'Recipient not found.' });
      // permission: same academy
      const sameAcademy = String(recipient.ownerId || recipient._id) === String(ownerId) || String(recipient._id) === String(ownerId);
      if (!sameAcademy) return res.status(403).json({ message: 'Recipient not in your academy.' });
      if (type === 'owner' && recipient.role !== 'owner') return res.status(400).json({ message: 'Recipient is not an owner.' });
      if (type === 'admin' && recipient.role !== 'admin') return res.status(400).json({ message: 'Recipient is not an admin.' });
      if (type === 'academy' && !['owner','admin'].includes(recipient.role)) return res.status(400).json({ message: 'Recipient is not an academy owner/admin.' });
      if (type === 'teacher' && recipient.role !== 'teacher') return res.status(400).json({ message: 'Recipient is not a teacher.' });
      recipientName = recipient.name;
    } else if (type === 'student' || type === 'parent') {
      if (!mongoose.isValidObjectId(resolvedRecipientId)) return res.status(400).json({ message: 'Invalid recipient.' });
      const student = await Student.findOne({ _id: resolvedRecipientId, userId: ownerId, isActive: true });
      if (!student) return res.status(404).json({ message: 'Student not found.' });
      if (allowedBatchIds && !allowedBatchIds.includes(String(student.batchId))) return res.status(403).json({ message: 'Student not in your assigned classes.' });
      recipientName = type === 'parent' ? (student.parentName || 'Parent') : student.name;
    } else {
      return res.status(400).json({ message: 'Invalid recipient type.' });
    }

    const item = await Message.create({
      ownerId,
      senderId: req.user.id,
      recipientId: resolvedRecipientId,
      recipientType: type,
      recipientName,
      batchId: resolvedBatch,
      subject: typeof subject === 'string' ? subject.trim().slice(0, 200) : '',
      content: content.trim(),
    });
    res.status(201).json({ success: true, message: 'Message sent.', data: { id: String(item._id), _id: item._id, subject: item.subject, content: item.content, createdAt: item.createdAt, recipientType: item.recipientType, recipientName: item.recipientName } });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to send message' }); }
};



const markMessageRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid message.' });
    const item = await Message.findOneAndUpdate({ _id: id, recipientId: req.user.id }, { $set: { read: true } }, { returnDocument: 'after' });
    if (!item) return res.status(404).json({ message: 'Message not found.' });
    res.json({ success: true, message: 'Message marked as read.' });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to update message' }); }
};

module.exports = {
  getProfile, updateProfile, changePassword,
  getOverview, getBatches, getStudents,
  getAttendance, markAttendance,
  getAssignments, createAssignment, updateAssignment, deleteAssignment,
  getMaterials, createMaterial, deleteMaterial,
  getMessages, sendMessage, getRecipients, markMessageRead,
};


