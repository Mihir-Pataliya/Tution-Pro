const mongoose = require('mongoose');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Student = require('../models/Student');
const Batch = require('../models/Batch');

const notifyRecipients = async (ownerId, event) => {
  if (event.status !== 'published') return;
  const recipients = new Map(); // userId -> role
  const add = (id, role) => { if (id && String(id) !== String(ownerId)) recipients.set(String(id), role); };

  if (event.audience === 'academy') {
    const teachers = await User.find({ ownerId, role: 'teacher', isActive: true }).select('_id').lean();
    teachers.forEach(t => add(t._id, 'Teacher'));
    const students = await Student.find({ userId: ownerId, isActive: true }).select('linkedUserId').lean();
    students.forEach(s => { if (s.linkedUserId) add(s.linkedUserId, 'Student'); });
  } else if (event.audience === 'batches') {
    const batches = await Batch.find({ _id: { $in: event.batchIds || [] }, userId: ownerId }).select('teacherId').lean();
    const batchTeachers = batches.map(b => b.teacherId).filter(Boolean);
    batchTeachers.forEach(t => add(t, 'Teacher'));
    const students = await Student.find({ userId: ownerId, batchId: { $in: event.batchIds || [] }, isActive: true }).select('linkedUserId').lean();
    students.forEach(s => { if (s.linkedUserId) add(s.linkedUserId, 'Student'); });
  } else if (event.audience === 'teachers') {
    (event.teacherIds || []).forEach(t => add(t, 'Teacher'));
  } else if (event.audience === 'students') {
    const students = await Student.find({ _id: { $in: event.studentIds || [] }, userId: ownerId }).select('linkedUserId').lean();
    students.forEach(s => { if (s.linkedUserId) add(s.linkedUserId, 'Student'); });
  }

  const docs = Array.from(recipients.entries()).map(([id, role]) => ({
    academyId: ownerId,
    recipientId: id,
    recipientRole: role,
    title: `New Event: ${event.title}`,
    message: `${event.category} scheduled. ${event.location ? event.location + '. ' : ''}${event.description || ''}`.trim(),
    type: 'EVENT',
    eventId: event._id,
  }));
  if (docs.length) await Notification.insertMany(docs);
};

const getEvents = async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();
    const upcoming = req.query.upcoming === 'true';
    const filter = { userId: ownerId };
    if (upcoming) filter.startDate = { $gte: now };
    const events = await Event.find(filter).sort({ startDate: 1 }).lean();
    res.json({ success: true, data: events });
  } catch (e) { res.status(500).json({ message: 'Failed to fetch events' }); }
};

const createEvent = async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.id);
    const { title, description, category, startDate, endDate, startTime, endTime, location, audience, batchIds, teacherIds, studentIds, status } = req.body;
    if (!title || !startDate) return res.status(400).json({ message: 'Title and start date required' });
    const ev = await Event.create({ userId: ownerId, academyId: ownerId, title, description, category, startDate, endDate, startTime, endTime, location, audience, batchIds, teacherIds, studentIds, status: status || 'published', createdBy: ownerId });
    await notifyRecipients(ownerId, ev);
    res.status(201).json({ success: true, data: ev });
  } catch (e) { console.error('createEvent error:', e); res.status(500).json({ message: 'Failed to create event' }); }
};

const updateEvent = async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.id);
    const ev = await Event.findOneAndUpdate({ _id: req.params.id, userId: ownerId }, req.body, { new: true });
    if (!ev) return res.status(404).json({ message: 'Event not found' });
    if (ev.status === 'published') await notifyRecipients(ownerId, ev);
    res.json({ success: true, data: ev });
  } catch (e) { res.status(500).json({ message: 'Failed to update event' }); }
};

const deleteEvent = async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.id);
    const ev = await Event.findOneAndDelete({ _id: req.params.id, userId: ownerId });
    if (!ev) return res.status(404).json({ message: 'Event not found' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: 'Failed to delete event' }); }
};

module.exports = { getEvents, createEvent, updateEvent, deleteEvent };
