const mongoose = require('mongoose');
const Enquiry = require('../models/Enquiry');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const User = require('../models/User');

const statuses = ['new', 'contacted', 'demo_scheduled', 'converted', 'lost'];
const tenant = (req) => ({ userId: req.user.id });
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeInput = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  const item = {
    studentName: clean(body.studentName, 100),
    studentAge: body.studentAge === '' || body.studentAge === null || body.studentAge === undefined ? undefined : Number(body.studentAge),
    parentName: clean(body.parentName, 100),
    parentPhone: clean(body.parentPhone, 30),
    parentEmail: clean(body.parentEmail, 254).toLowerCase(),
    interestedCourse: clean(body.interestedCourse, 120),
    notes: clean(body.notes, 2000),
    lostReason: clean(body.lostReason, 80),
    lostNotes: clean(body.lostNotes, 2000),
    source: clean(body.source, 80),
    status: body.status || 'new',
    followUpDate: null,
  };
  if (!item.studentName) return { error: 'Student name is required.' };
  if (!/^[+\d().\-\s]{7,30}$/.test(item.parentPhone) || !/\d/.test(item.parentPhone)) return { error: 'Enter a valid parent phone number.' };
  if (item.parentEmail && !/^\S+@\S+\.\S+$/.test(item.parentEmail)) return { error: 'Enter a valid parent email address.' };
  if (item.studentAge !== undefined && (!Number.isInteger(item.studentAge) || item.studentAge < 2 || item.studentAge > 100)) return { error: 'Student age must be a whole number from 2 to 100.' };
  if (!statuses.includes(item.status) || item.status === 'converted') return { error: 'Choose a valid enquiry status. Conversion is completed from the enquiry actions.' };
  if (body.followUpDate) {
    const date = new Date(body.followUpDate);
    if (Number.isNaN(date.getTime())) return { error: 'Enter a valid follow-up date.' };
    item.followUpDate = date;
  }
  return { item };
};

const list = async (req, res) => {
  const filter = tenant(req);
  const status = req.query.status;
  if (status && status !== 'all') {
    if (!statuses.includes(status)) return res.status(400).json({ message: 'Invalid enquiry status filter.' });
    filter.status = status;
  }
  if (req.query.search) {
    const term = escapeRegex(String(req.query.search).trim().slice(0, 80));
    filter.$or = [
      { studentName: new RegExp(term, 'i') },
      { parentName: new RegExp(term, 'i') },
      { parentPhone: new RegExp(term, 'i') },
      { interestedCourse: new RegExp(term, 'i') },
    ];
  }
  const enquiries = await Enquiry.find(filter)
    .populate({ path: 'convertedStudentId', select: 'name', match: tenant(req) })
    .sort({ followUpDate: 1, createdAt: -1 })
    .limit(250)
    .lean();
  res.json({ success: true, data: enquiries });
};

const create = async (req, res) => {
  const { item, error } = normalizeInput(req.body);
  if (error) return res.status(400).json({ message: error });
  const enquiry = await Enquiry.create({ ...item, userId: req.user.id });
  res.status(201).json({ success: true, data: enquiry });
};

const update = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid enquiry id.' });
  const { item, error } = normalizeInput(req.body);
  if (error) return res.status(400).json({ message: error });
  const enquiry = await Enquiry.findOne({ _id: req.params.id, ...tenant(req) });
  if (!enquiry) return res.status(404).json({ message: 'Enquiry not found.' });
  if (enquiry.status === 'converted') return res.status(409).json({ message: 'A converted enquiry cannot be edited.' });
  const wasLost = enquiry.status === 'lost';
  const newStatus = item.status;
  Object.assign(enquiry, item);
  if (wasLost && newStatus && newStatus !== 'lost') {
    enquiry.recoveryHistory = enquiry.recoveryHistory || [];
    enquiry.recoveryHistory.push({ lostReason: enquiry.lostReason, lostAt: enquiry.updatedAt, recoveredAt: new Date(), newStatus });
  }
  await enquiry.save();
  res.json({ success: true, data: enquiry });
};

const convert = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid enquiry id.' });
  if (!mongoose.isValidObjectId(req.body?.batchId)) return res.status(400).json({ message: 'Choose a batch for the new student.' });
  const enquiry = await Enquiry.findOne({ _id: req.params.id, ...tenant(req) });
  if (!enquiry) return res.status(404).json({ message: 'Enquiry not found.' });
  if (enquiry.convertedStudentId) {
    const existing = await Student.findOne({ _id: enquiry.convertedStudentId, userId: req.user.id }).select('_id name');
    if (existing) return res.json({ success: true, message: 'This enquiry is already converted.', data: existing });
  }
  const batch = await Batch.findOne({ _id: req.body.batchId, userId: req.user.id }).select('_id');
  if (!batch) return res.status(400).json({ message: 'The selected batch was not found in this academy.' });
  let student = await Student.findOne({ userId: req.user.id, enquiryId: enquiry._id });
  if (!student) {
    const owner = await User.findById(req.user.id).select('studentLimit subscriptionExpiresAt');
    const count = await Student.countDocuments({ userId: req.user.id });
    if (owner?.studentLimit !== undefined && count >= owner.studentLimit) return res.status(403).json({ message: `Your plan allows up to ${owner.studentLimit} students. Update your subscription limits to add more.` });
    if (owner?.subscriptionExpiresAt && owner.subscriptionExpiresAt < new Date()) return res.status(403).json({ message: 'Your subscription has expired. Update your plan settings to convert this enquiry.' });
    try {
      student = await Student.create({
        userId: req.user.id,
        enquiryId: enquiry._id,
        name: enquiry.studentName,
        age: enquiry.studentAge,
        parentName: enquiry.parentName,
        parentPhone: enquiry.parentPhone,
        batchId: batch._id,
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      student = await Student.findOne({ userId: req.user.id, enquiryId: enquiry._id });
      if (!student) throw error;
    }
  }
  enquiry.status = 'converted';
  enquiry.convertedStudentId = student._id;
  enquiry.convertedAt = enquiry.convertedAt || new Date();
  await enquiry.save();
  res.json({ success: true, message: 'Enquiry converted to a student.', data: { _id: student._id, name: student.name } });
};

const remove = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid enquiry id.' });
  const enquiry = await Enquiry.findOne({ _id: req.params.id, ...tenant(req) });
  if (!enquiry) return res.status(404).json({ message: 'Enquiry not found.' });
  if (enquiry.convertedStudentId) return res.status(409).json({ message: 'Converted enquiries are kept with the student record.' });
  await enquiry.deleteOne();
  res.json({ success: true, message: 'Enquiry deleted.' });
};

module.exports = { list, create, update, convert, remove };
