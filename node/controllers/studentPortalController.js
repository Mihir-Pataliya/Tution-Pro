const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const StudyMaterial = require('../models/StudyMaterial');
const Fee = require('../models/Fee');
const Message = require('../models/Message');

async function getScope(req) {
  const user = await User.findById(req.user.id).select('name email phone role tuitionName ownerId batchIds isActive notificationPreferences subject');
  if (!user || !user.isActive || user.role !== 'student') return null;
  const ownerId = user.ownerId ? String(user.ownerId) : null;
  const allowedBatchIds = (user.batchIds || []).map((id) => String(id));
  return { user, ownerId, allowedBatchIds };
}

async function resolveStudentRecords(scope) {
  const { user, ownerId, allowedBatchIds } = scope;
  if (!ownerId || !allowedBatchIds.length) return [];
  const objIds = allowedBatchIds.filter(mongoose.isValidObjectId).map((id) => new mongoose.Types.ObjectId(id));
  const records = await Student.find({
    userId: ownerId,
    batchId: { $in: objIds },
    $or: [{ linkedUserId: user._id }, { name: user.name }],
    isActive: true,
  }).lean();
  try {
    const toLink = records.filter((r) => !r.linkedUserId && r.name === user.name).map((r) => r._id);
    if (toLink.length) await Student.updateMany({ _id: { $in: toLink } }, { $set: { linkedUserId: user._id } });
  } catch (e) { /* ignore */ }
  return records;
}

function batchScopeOk(scope, batchId) {
  return !batchId || scope.allowedBatchIds.includes(String(batchId));
}

const getProfile = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Student account is not linked to an academy.' });
    const { user, ownerId, allowedBatchIds } = scope;
    const owner = await User.findById(ownerId).select('tuitionName name email phone').lean();
    const batches = await Batch.find({ userId: ownerId, _id: { $in: allowedBatchIds } }).sort({ name: 1 }).lean();
    const records = await resolveStudentRecords(scope);
    res.json({ success: true, data: {
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, tuitionName: user.tuitionName, ownerId, batchIds: allowedBatchIds, notificationPreferences: user.notificationPreferences },
      academy: owner ? { id: owner._id, name: owner.tuitionName || owner.name, email: owner.email, phone: owner.phone } : null,
      batches: batches.map((b) => ({ id: String(b._id), _id: b._id, name: b.name, subject: b.subject || '', timing: b.timings || '', days: b.days || [], maxStudents: b.maxStudents || 30 })),
      studentRecords: records.map((r) => ({ id: String(r._id), _id: r._id, name: r.name, batchId: r.batchId, monthlyFee: r.monthlyFee, parentName: r.parentName, parentPhone: r.parentPhone })),
    } });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to load profile' }); }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Account not found' });
    const { name, phone } = req.body || {};
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ message: 'Name is required.' });
    if (typeof phone === 'string' && phone.trim() && (!/^[+\d().\-\s]{7,30}$/.test(phone.trim()) || !/\d/.test(phone))) return res.status(400).json({ message: 'Enter a valid phone number.' });
    user.name = name.trim();
    if (typeof phone === 'string') user.phone = phone.trim();
    await user.save();
    res.json({ success: true, message: 'Profile updated.', data: { name: user.name, phone: user.phone } });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to update profile' }); }
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
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to change password' }); }
};

const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notificationPreferences').lean();
    if (!user) return res.status(404).json({ message: 'Account not found' });
    res.json({ success: true, data: { notificationPreferences: user.notificationPreferences || {} } });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to load settings' }); }
};

const updateSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Account not found' });
    const prefs = req.body?.notificationPreferences;
    if (prefs && typeof prefs === 'object') {
      user.notificationPreferences = { ...(user.notificationPreferences || {}), ...prefs };
      await user.save();
    }
    res.json({ success: true, message: 'Settings updated.', data: { notificationPreferences: user.notificationPreferences } });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to update settings' }); }
};

const getOverview = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Student account is not linked to an academy.' });
    const { user, ownerId, allowedBatchIds } = scope;
    const objIds = allowedBatchIds.filter(mongoose.isValidObjectId).map((id) => new mongoose.Types.ObjectId(id));
    const records = await resolveStudentRecords(scope);
    const studentIds = records.map((r) => r._id);
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const tomorrow = new Date(todayStart.getTime() + 86400000);
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const [batches, todayAttendance, allAttendance] = await Promise.all([
      Batch.find({ userId: ownerId, _id: { $in: objIds }, isActive: true }).lean(),
      Attendance.find({ userId: ownerId, studentId: { $in: studentIds }, date: { $gte: todayStart, $lt: tomorrow } }).lean(),
      Attendance.find({ userId: ownerId, studentId: { $in: studentIds } }).lean(),
    ]);
    const assignments = await Assignment.find({ ownerId, batchId: { $in: objIds } }).sort({ createdAt: -1 }).lean();
    const pendingAssignments = assignments.filter((a) => a.status !== 'closed');
    const fees = studentIds.length ? await Fee.find({ userId: ownerId, studentId: { $in: studentIds } }).lean() : [];
    const dueFees = fees.filter((f) => ['pending','partial','overdue'].includes(f.status));
    const feesDueAmount = dueFees.reduce((s, f) => s + (f.amount || 0), 0);
    const presentCount = allAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
    const attendancePct = allAttendance.length ? Math.round((presentCount / allAttendance.length) * 100) : 0;
    const todayClasses = batches.filter((b) => (b.days || []).some((d) => String(d).toLowerCase().startsWith(todayName.slice(0,3).toLowerCase())));
    const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const todayIdx = new Date().getDay();
    let minDiff = 8;
    let nextClass = null;
    batches.forEach((b) => {
      (b.days || []).forEach((d) => {
        const idx = DAYS.findIndex((x) => x.toLowerCase() === String(d).toLowerCase());
        if (idx < 0) return;
        let diff = idx - todayIdx;
        if (diff < 0) diff += 7;
        if (diff < minDiff) { minDiff = diff; nextClass = b; }
      });
    });
    const recipientIds = [user._id, ...studentIds];
    const recentMessages = await Message.find({ $or: [{ recipientId: { $in: recipientIds } }, { senderId: user._id }] }).sort({ createdAt: -1 }).limit(8).lean();
    res.json({ success: true, data: {
      stats: {
        batches: batches.length,
        attendancePct,
        totalAttendance: allAttendance.length,
        presentToday: todayAttendance.filter((a) => a.status === 'present' || a.status === 'late').length,
        pendingAssignments: pendingAssignments.length,
        feesDueAmount,
        dueFeesCount: dueFees.length,
      },
      batches: batches.map((b) => ({ id: String(b._id), name: b.name, subject: b.subject || '', timing: b.timings || '', days: b.days || [], studentCount: 0 })),
      todayClasses: todayClasses.map((b) => ({ id: String(b._id), name: b.name, subject: b.subject || '', timing: b.timings || '' })),
      nextClass: nextClass ? { id: String(nextClass._id), name: nextClass.name, subject: nextClass.subject || '', timing: nextClass.timings || '', days: nextClass.days || [] } : null,
      pendingAssignmentsList: pendingAssignments.slice(0, 5).map((a) => ({ id: String(a._id), title: a.title, dueDate: a.dueDate, batchId: a.batchId })),
      dueFees: dueFees.slice(0, 5).map((f) => ({ id: String(f._id), amount: f.amount, dueDate: f.dueDate, status: f.status, description: f.description })),
      recentActivity: recentMessages.map((m) => ({ type: 'message', title: m.subject || String(m.content).slice(0, 60), at: m.createdAt })),
    } });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to load dashboard' }); }
};

const getBatches = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Student account is not linked to an academy.' });
    const { ownerId, allowedBatchIds } = scope;
    const objIds = allowedBatchIds.filter(mongoose.isValidObjectId).map((id) => new mongoose.Types.ObjectId(id));
    const batches = await Batch.find({ userId: ownerId, _id: { $in: objIds }, isActive: true }).sort({ name: 1 }).lean();
    const counts = await Student.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(ownerId), batchId: { $in: objIds }, isActive: true } },
      { $group: { _id: '$batchId', count: { $sum: 1 } } },
    ]);
    const cmap = new Map(counts.map((r) => [String(r._id), r.count]));
    res.json({ success: true, data: batches.map((b) => ({ id: String(b._id), _id: b._id, name: b.name, subject: b.subject || '', timing: b.timings || '', timings: b.timings || '', days: b.days || [], maxStudents: b.maxStudents || 30, studentCount: cmap.get(String(b._id)) || 0 })) });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to load classes' }); }
};

const getAttendance = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Student account is not linked to an academy.' });
    const { ownerId } = scope;
    const records = await resolveStudentRecords(scope);
    const studentIds = records.map((r) => r._id);
    const { batchId } = req.query;
    if (batchId && !batchScopeOk(scope, batchId)) return res.status(403).json({ message: 'You are not assigned to this batch' });
    const filter = { userId: ownerId, studentId: { $in: studentIds } };
    if (batchId) filter.batchId = batchId;
    const items = await Attendance.find(filter).populate({ path: 'batchId', select: 'name timings' }).sort({ date: -1 }).lean();
    const total = items.length;
    const present = items.filter((a) => a.status === 'present' || a.status === 'late').length;
    const pct = total ? Math.round((present / total) * 100) : 0;
    res.json({ success: true, data: {
      records: items.map((a) => ({ id: String(a._id), date: a.date, status: a.status, batchId: a.batchId ? { _id: a.batchId._id, name: a.batchId.name, timing: a.batchId.timings } : a.batchId })),
      summary: { total, present, absent: items.filter((a) => a.status === 'absent').length, late: items.filter((a) => a.status === 'late').length, percentage: pct },
    } });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to load attendance' }); }
};

const getAssignments = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Student account is not linked to an academy.' });
    const { ownerId, allowedBatchIds } = scope;
    const { batchId } = req.query;
    if (batchId && !batchScopeOk(scope, batchId)) return res.status(403).json({ message: 'You are not assigned to this batch' });
    const filter = { ownerId, batchId: batchId ? batchId : { $in: allowedBatchIds } };
    const items = await Assignment.find(filter).populate({ path: 'batchId', select: 'name' }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: items.map((a) => ({ id: String(a._id), _id: a._id, title: a.title, description: a.description, dueDate: a.dueDate, status: a.status, batchId: a.batchId ? { _id: a.batchId._id, name: a.batchId.name } : null, createdAt: a.createdAt })) });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to load assignments' }); }
};

const getMaterials = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Student account is not linked to an academy.' });
    const { ownerId, allowedBatchIds } = scope;
    const { batchId } = req.query;
    if (batchId && !batchScopeOk(scope, batchId)) return res.status(403).json({ message: 'You are not assigned to this batch' });
    const filter = { ownerId, batchId: batchId ? batchId : { $in: allowedBatchIds } };
    const items = await StudyMaterial.find(filter).populate({ path: 'batchId', select: 'name' }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: items.map((m) => ({ id: String(m._id), _id: m._id, title: m.title, description: m.description, type: m.type, url: m.url, batchId: m.batchId ? { _id: m.batchId._id, name: m.batchId.name } : null, createdAt: m.createdAt })) });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to load materials' }); }
};

const getTimetable = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Student account is not linked to an academy.' });
    const { ownerId, allowedBatchIds } = scope;
    const objIds = allowedBatchIds.filter(mongoose.isValidObjectId).map((id) => new mongoose.Types.ObjectId(id));
    const batches = await Batch.find({ userId: ownerId, _id: { $in: objIds }, isActive: true }).sort({ name: 1 }).lean();
    res.json({ success: true, data: batches.map((b) => ({ id: String(b._id), _id: b._id, name: b.name, subject: b.subject || '', timing: b.timings || '', timings: b.timings || '', days: b.days || [], maxStudents: b.maxStudents || 30 })) });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to load timetable' }); }
};

const getFees = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Student account is not linked to an academy.' });
    const { ownerId } = scope;
    const records = await resolveStudentRecords(scope);
    const studentIds = records.map((r) => r._id);
    if (!studentIds.length) return res.json({ success: true, data: { fees: [], summary: { total: 0, paid: 0, pending: 0, overdue: 0, dueAmount: 0 } } });
    const fees = await Fee.find({ userId: ownerId, studentId: { $in: studentIds } }).populate({ path: 'batchId', select: 'name' }).sort({ dueDate: -1 }).lean();
    const summary = {
      total: fees.length,
      paid: fees.filter((f) => f.status === 'paid').length,
      pending: fees.filter((f) => f.status === 'pending' || f.status === 'partial').length,
      overdue: fees.filter((f) => f.status === 'overdue').length,
      dueAmount: fees.filter((f) => ['pending','partial','overdue'].includes(f.status)).reduce((s, f) => s + (f.amount || 0), 0),
    };
    res.json({ success: true, data: { fees: fees.map((f) => ({ id: String(f._id), _id: f._id, amount: f.amount, dueDate: f.dueDate, paidDate: f.paidDate, status: f.status, description: f.description, batchId: f.batchId ? { _id: f.batchId._id, name: f.batchId.name } : null })), summary } });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to load fees' }); }
};

const getMessages = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Student account is not linked to an academy.' });
    const { user } = scope;
    const records = await resolveStudentRecords(scope);
    const ids = [user._id, ...records.map((r) => r._id)];
    const items = await Message.find({ $or: [{ senderId: user._id }, { recipientId: { $in: ids } }] }).populate({ path: 'senderId', select: 'name role' }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: items.map((m) => ({ id: String(m._id), _id: m._id, subject: m.subject, content: m.content, recipientType: m.recipientType, recipientName: m.recipientName, batchId: m.batchId, read: m.read, sender: m.senderId ? { id: String(m.senderId._id || m.senderId), name: m.senderId.name || '', role: m.senderId.role || '' } : null, recipientId: m.recipientId, createdAt: m.createdAt })) });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to load messages' }); }
};

const getRecipients = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Student account is not linked to an academy.' });
    const { ownerId, allowedBatchIds } = scope;
    const type = String(req.query.type || 'academy');
    let out = [];
    if (type === 'academy' || type === 'owner' || type === 'admin') {
      const owners = await User.find({ $or: [{ _id: ownerId }, { ownerId, role: { $in: ['admin'] } }], isActive: true }).select('name role').lean();
      out = owners.map((u) => ({ id: String(u._id), name: u.name, type: u.role === 'owner' ? 'owner' : 'admin' }));
    } else if (type === 'teacher') {
      const teachers = await User.find({ ownerId, role: 'teacher', batchIds: { $in: allowedBatchIds }, isActive: true }).select('name subject batchIds').lean();
      out = teachers.map((t) => ({ id: String(t._id), name: t.name, type: 'teacher' }));
    } else if (type === 'student') {
      const students = await User.find({ ownerId, role: 'student', batchIds: { $in: allowedBatchIds }, _id: { $ne: req.user.id }, isActive: true }).select('name batchIds').lean();
      out = students.map((s) => ({ id: String(s._id), name: s.name, type: 'student' }));
    }
    res.json({ success: true, data: out });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to load recipients' }); }
};

const sendMessage = async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope || !scope.ownerId) return res.status(400).json({ message: 'Student account is not linked to an academy.' });
    const { user, ownerId, allowedBatchIds } = scope;
    const { content, subject, recipientType, recipientId, batchId } = req.body || {};
    if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ message: 'Message content is required.' });
    const type = recipientType || 'academy';
    let resolvedRecipientId = recipientId;
    let recipientName = '';
    let resolvedBatch = null;
    if (batchId && mongoose.isValidObjectId(batchId)) {
      if (!allowedBatchIds.includes(String(batchId))) return res.status(403).json({ message: 'Batch not assigned to you.' });
      resolvedBatch = batchId;
    }
    const allowedTypes = ['owner','admin','teacher','student','parent','academy'];
    if (!allowedTypes.includes(type)) return res.status(400).json({ message: 'Invalid recipient type.' });
    if (type === 'academy') {
      resolvedRecipientId = ownerId;
      const owner = await User.findById(ownerId).select('name').lean();
      recipientName = owner?.name || 'Academy';
    } else {
      if (!mongoose.isValidObjectId(resolvedRecipientId)) return res.status(400).json({ message: 'Invalid recipient.' });
      const recipient = await User.findOne({ _id: resolvedRecipientId, isActive: true });
      if (!recipient) return res.status(404).json({ message: 'Recipient not found.' });
      const sameAcademy = String(recipient.ownerId || recipient._id) === String(ownerId) || String(recipient._id) === String(ownerId);
      if (!sameAcademy) return res.status(403).json({ message: 'Recipient not in your academy.' });
      if (type === 'teacher' && recipient.role !== 'teacher') return res.status(400).json({ message: 'Recipient is not a teacher.' });
      if ((type === 'owner' || type === 'academy') && recipient.role !== 'owner') return res.status(400).json({ message: 'Recipient is not an owner.' });
      if (type === 'admin' && recipient.role !== 'admin') return res.status(400).json({ message: 'Recipient is not an admin.' });
      if (type === 'student' && recipient.role !== 'student') return res.status(400).json({ message: 'Recipient is not a student.' });
      recipientName = recipient.name;
    }
    const item = await Message.create({
      ownerId,
      senderId: user._id,
      recipientId: resolvedRecipientId,
      recipientType: type === 'academy' ? 'owner' : type,
      recipientName,
      batchId: resolvedBatch,
      subject: typeof subject === 'string' ? subject.trim().slice(0, 200) : '',
      content: content.trim(),
    });
    res.status(201).json({ success: true, message: 'Message sent.', data: { id: String(item._id), _id: item._id, subject: item.subject, content: item.content, createdAt: item.createdAt } });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to send message' }); }
};

const markMessageRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid message.' });
    const scope = await getScope(req);
    const records = scope ? await resolveStudentRecords(scope) : [];
    const ids = scope ? [req.user.id, ...records.map((r) => String(r._id))] : [req.user.id];
    const item = await Message.findOneAndUpdate({ _id: id, recipientId: { $in: ids } }, { $set: { read: true } }, { returnDocument: 'after' });
    if (!item) return res.status(404).json({ message: 'Message not found.' });
    res.json({ success: true, message: 'Message marked as read.' });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Failed to update message' }); }
};

module.exports = {
  getProfile, updateProfile, changePassword, getSettings, updateSettings,
  getOverview, getBatches, getAttendance, getAssignments, getMaterials, getTimetable, getFees,
  getMessages, getRecipients, sendMessage, markMessageRead,
};


