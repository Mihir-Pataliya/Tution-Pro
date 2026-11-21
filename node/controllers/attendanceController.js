const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Batch = require('../models/Batch');
const Student = require('../models/Student');

const dayBounds = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start.getTime() + 86400000);
  return { start, end, iso: start.toISOString().slice(0, 10) };
};

const startOfToday = () => dayBounds();

const getBatchAttendance = async (req, res) => {
  try {
    const { batchId, date } = req.query;
    if (!batchId || !mongoose.isValidObjectId(batchId)) return res.status(400).json({ message: 'Choose a valid batch' });
    const ownerId = req.user.id;
    const batch = await Batch.findOne({ _id: batchId, userId: ownerId }).lean();
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    const bounds = dayBounds(date || new Date());
    if (!bounds) return res.status(400).json({ message: 'Choose a valid date' });
    const students = await Student.find({ userId: ownerId, batchId, isActive: true }).select('name').sort({ name: 1 }).lean();
    const attendance = await Attendance.find({ userId: ownerId, batchId, date: { $gte: bounds.start, $lt: bounds.end } }).select('studentId status').lean();
    const records = new Map(attendance.map((record) => [String(record.studentId), record.status]));
    res.json({ success: true, data: { batch: { id: String(batch._id), name: batch.name }, date: bounds.iso, students: students.map((student) => ({ id: String(student._id), name: student.name, status: records.get(String(student._id)) || '' })) } });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Failed to load attendance' });
  }
};

const markBatchAttendance = async (req, res) => {
  const { batchId, records, date } = req.body || {};
  if (!mongoose.isValidObjectId(batchId) || !Array.isArray(records)) return res.status(400).json({ message: 'Batch and attendance records are required' });
  if (records.length > 200) return res.status(400).json({ message: 'Too many attendance records' });
  try {
    const ownerId = req.user.id;
    const batch = await Batch.findOne({ _id: batchId, userId: ownerId });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    const bounds = dayBounds(date || new Date());
    if (!bounds) return res.status(400).json({ message: 'Choose a valid date' });
    const studentIds = [...new Set(records.map((record) => String(record.studentId)))];
    if (studentIds.some((id) => !mongoose.isValidObjectId(id))) return res.status(400).json({ message: 'Invalid student in attendance records' });
    const ownedStudents = await Student.find({ _id: { $in: studentIds }, userId: ownerId, batchId, isActive: true }).select('_id').lean();
    if (ownedStudents.length !== studentIds.length) return res.status(400).json({ message: 'One or more students do not belong to this batch' });
    const allowed = new Set(['present', 'absent', 'late']);
    if (records.some((record) => !allowed.has(record.status))) return res.status(400).json({ message: 'Attendance status must be present, absent, or late' });

    await Promise.all(records.map(({ studentId, status }) => Attendance.findOneAndUpdate(
      { userId: ownerId, batchId, studentId, date: { $gte: bounds.start, $lt: bounds.end } },
      { $set: { userId: ownerId, batchId, studentId, date: bounds.start, status } },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
    )));
    res.json({ success: true, message: 'Attendance saved', data: { saved: records.length, date: bounds.iso } });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Failed to save attendance' });
  }
};

const getAttendanceHistory = async (req, res) => {
  try {
    const { batchId, days = 7 } = req.query;
    if (!batchId || !mongoose.isValidObjectId(batchId)) return res.status(400).json({ message: 'Choose a valid batch' });
    const ownerId = req.user.id;
    const batch = await Batch.findOne({ _id: batchId, userId: ownerId }).lean();
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    const count = Math.min(Math.max(Number(days) || 7, 1), 30);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const start = new Date(); start.setDate(start.getDate() - (count - 1)); start.setHours(0, 0, 0, 0);
    const records = await Attendance.find({ userId: ownerId, batchId, date: { $gte: start, $lte: end } }).select('date status').lean();
    const byDay = new Map();
    for (let i = 0; i < count; i += 1) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      byDay.set(d.toISOString().slice(0, 10), { date: d.toISOString().slice(0, 10), present: 0, absent: 0, late: 0, total: 0 });
    }
    records.forEach((record) => {
      const key = new Date(record.date).toISOString().slice(0, 10);
      const item = byDay.get(key);
      if (!item) return;
      item.total += 1;
      if (record.status === 'present') item.present += 1;
      else if (record.status === 'absent') item.absent += 1;
      else if (record.status === 'late') item.late += 1;
    });
    res.json({ success: true, data: Array.from(byDay.values()) });
  } catch (error) {
    console.error('Attendance history error:', error);
    res.status(500).json({ message: 'Failed to load attendance history' });
  }
};

module.exports = { getBatchAttendance, markBatchAttendance, getAttendanceHistory };
