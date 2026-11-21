const crypto = require('crypto');
const mongoose = require('mongoose');
const StudentInvitation = require('../models/StudentInvitation');
const Batch = require('../models/Batch');
const User = require('../models/User');

const INVITE_TTL_HOURS = Number(process.env.INVITE_TTL_HOURS || 72);
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const hash = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
const nowPlus = (h) => new Date(Date.now() + h * 3600 * 1000);

const withStatus = (doc) => {
  const o = doc.toObject ? doc.toObject() : { ...doc };
  if (o.status === 'pending' && o.expiresAt && new Date(o.expiresAt) < new Date()) o.status = 'expired';
  delete o.tokenHash;
  return o;
};

async function sendInviteEmail(args) {
  const to = args.to;
  const inviteUrl = args.inviteUrl;
  const nodeEnv = process.env.NODE_ENV || 'development';
  const subjectLine = "You're invited to join " + args.academy + ' as Student';
  const html = '<div style="font-family:sans-serif;max-width:560px"><h2>' + args.academy + ' invited you to join as Student</h2><p>Hi ' + (args.name || 'there') + ',</p><p>Click the secure link below to create your student login. It expires on ' + new Date(args.expiresAt).toLocaleString() + '.</p><p><a href="' + inviteUrl + '">Accept invitation</a></p><p style="color:#666;font-size:12px">' + inviteUrl + '</p></div>';
  const text = args.academy + ' invited you (' + (args.name || 'student') + ') to join as Student.\nAccept here (expires ' + new Date(args.expiresAt).toLocaleString() + '): ' + inviteUrl + '\n';
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('[invite-email:' + nodeEnv + '] to=' + to + ' link=' + inviteUrl);
    return { delivered: false, previewUrl: inviteUrl };
  }
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  });
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject: subjectLine, text, html });
  } catch (e) {
    console.error('[invite-email] SMTP send failed:', e && e.message);
    return { delivered: false, previewUrl: inviteUrl, emailError: (e && e.message) || 'Email delivery failed' };
  }
  return { delivered: true };
}

const getScope = async (req) => {
  const user = await User.findById(req.user.id).select('name email role ownerId batchIds isActive');
  if (!user || !user.isActive) return null;
  const ownerId = user.role === 'teacher' ? (user.ownerId ? String(user.ownerId) : null) : String(user._id);
  return { user, ownerId, allowedBatchIds: user.role === 'teacher' ? (user.batchIds || []).map(String) : null };
};

const checkPermission = async (req) => {
  const scope = await getScope(req);
  if (!scope) return false;
  if (scope.user.role === 'owner' || scope.user.role === 'admin') return true;
  if (scope.user.role === 'teacher') {
    const owner = await User.findById(scope.ownerId).select('rolePermissions').lean();
    const perms = owner?.rolePermissions?.teacher || [];
    return perms.includes('students');
  }
  return false;
};

const normalize = async (req, body) => {
  body = body || {};
  const name = clean(body.name, 100);
  const email = clean(body.email, 254).toLowerCase();
  const phone = clean(body.phone, 30);
  let batchIds = Array.isArray(body.batchIds) ? body.batchIds : body.batches || [];
  if (typeof batchIds === 'string') batchIds = [batchIds];
  batchIds = [...new Set(batchIds.filter(Boolean))];
  if (!name) return { error: 'Student name is required.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Enter a valid student email address.' };
  if (phone && (!/^[+\d().\-\s]{7,30}$/.test(phone) || !/\d/.test(phone))) return { error: 'Enter a valid phone number.' };
  for (const id of batchIds) if (!mongoose.isValidObjectId(id)) return { error: 'One selected batch is invalid.' };
  const scope = await getScope(req);
  if (!scope) return { error: 'Account is not linked to an academy.' };
  const ownerId = scope.ownerId;
  const allowedBatchIds = scope.allowedBatchIds;
  if (!ownerId) return { error: 'Account is not linked to an academy.' };
  if (batchIds.length) {
    const count = await Batch.countDocuments({ _id: { $in: batchIds }, userId: ownerId });
    if (count !== batchIds.length) return { error: 'Selected batches were not found in this academy.' };
  }
  if (req.user.role === 'teacher') {
    const allowed = (req.user.batchIds || []).map(String);
    if (batchIds.some((id) => !allowed.includes(String(id)))) return { error: 'You can only invite students to your assigned batches.' };
  }
  const existingUser = await User.findOne({ email }).select('_id');
  if (existingUser) return { error: 'This email is already registered in TuitionPro.' };
  const dup = await StudentInvitation.findOne({ ownerId, email, status: 'pending' });
  if (dup && dup.expiresAt > new Date()) return { error: 'A pending invitation already exists for this email.' };
  return { item: { name, email, phone, batchIds }, ownerId };
};

const list = async (req, res, next) => {
  try {
    if (!(await checkPermission(req))) return res.status(403).json({ message: 'Permission denied.' });
    const scope = await getScope(req);
  if (!scope) return { error: 'Account is not linked to an academy.' };
  const ownerId = scope.ownerId;
  const allowedBatchIds = scope.allowedBatchIds;
    const status = req.query.status;
    const filter = { ownerId };
    if (status && status !== 'all') {
      if (!['pending', 'accepted', 'expired', 'cancelled'].includes(status)) return res.status(400).json({ message: 'Invalid status filter.' });
      filter.status = status;
    }
    const items = await StudentInvitation.find(filter).populate({ path: 'batchIds', select: 'name subject', match: { userId: ownerId } }).sort({ createdAt: -1 }).limit(250).lean();
    res.json({ success: true, data: items.map(withStatus) });
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    if (!(await checkPermission(req))) return res.status(403).json({ message: 'Permission denied.' });
    const result = await normalize(req, req.body);
    if (result.error) return res.status(400).json({ message: result.error });
    const { item, ownerId } = result;
    const owner = await User.findById(ownerId).select('tuitionName name');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = nowPlus(INVITE_TTL_HOURS);
    const invite = await StudentInvitation.create({ name: item.name, email: item.email, phone: item.phone, batchIds: item.batchIds, ownerId, invitedBy: req.user.id, invitedByRole: req.user.role === 'teacher' ? 'teacher' : 'owner', tokenHash: hash(token), expiresAt, lastSentAt: new Date() });
    const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const inviteUrl = base + '/invite/' + token;
    const academy = (owner && (owner.tuitionName || owner.name)) || 'Your academy';
    const mail = await sendInviteEmail({ to: item.email, name: item.name, inviteUrl, expiresAt, academy });
    const payload = withStatus(invite);
    if (!mail.delivered) payload.inviteUrl = inviteUrl;
    res.status(201).json({ success: true, message: mail.delivered ? 'Invitation sent.' : 'Invitation saved. Email logged (SMTP not configured).', data: payload });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'Invitation link already exists. Try again.' });
    next(e);
  }
};

const resend = async (req, res, next) => {
  try {
    if (!(await checkPermission(req))) return res.status(403).json({ message: 'Permission denied.' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid invitation id.' });
    const scope = await getScope(req);
  if (!scope) return { error: 'Account is not linked to an academy.' };
  const ownerId = scope.ownerId;
  const allowedBatchIds = scope.allowedBatchIds;
    const invite = await StudentInvitation.findOne({ _id: req.params.id, ownerId });
    if (!invite) return res.status(404).json({ message: 'Invitation not found.' });
    if (invite.status !== 'pending') return res.status(409).json({ message: 'Only pending invitations can be resent.' });
    const owner = await User.findById(ownerId).select('tuitionName name');
    const token = crypto.randomBytes(32).toString('hex');
    invite.tokenHash = hash(token);
    invite.expiresAt = nowPlus(INVITE_TTL_HOURS);
    invite.lastSentAt = new Date();
    await invite.save();
    const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const inviteUrl = base + '/invite/' + token;
    const mail = await sendInviteEmail({ to: invite.email, name: invite.name, inviteUrl, expiresAt: invite.expiresAt, academy: (owner && (owner.tuitionName || owner.name)) || 'Your academy' });
    const payload = withStatus(invite);
    if (!mail.delivered) payload.inviteUrl = inviteUrl;
    res.json({ success: true, message: mail.delivered ? 'Invitation resent.' : 'Invitation renewed. Email logged (SMTP not configured).', data: payload });
  } catch (e) { next(e); }
};

const cancel = async (req, res, next) => {
  try {
    if (!(await checkPermission(req))) return res.status(403).json({ message: 'Permission denied.' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid invitation id.' });
    const scope = await getScope(req);
  if (!scope) return { error: 'Account is not linked to an academy.' };
  const ownerId = scope.ownerId;
  const allowedBatchIds = scope.allowedBatchIds;
    const invite = await StudentInvitation.findOne({ _id: req.params.id, ownerId });
    if (!invite) return res.status(404).json({ message: 'Invitation not found.' });
    if (invite.status !== 'pending') return res.status(409).json({ message: 'Only pending invitations can be cancelled.' });
    invite.status = 'cancelled';
    await invite.save();
    res.json({ success: true, message: 'Invitation cancelled.', data: withStatus(invite) });
  } catch (e) { next(e); }
};

const getPublicInvite = async (req, res, next) => {
  try {
    const token = String(req.params.token || '');
    if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ message: 'This invitation link is invalid.' });
    const invite = await StudentInvitation.findOne({ tokenHash: hash(token) }).populate({ path: 'batchIds', select: 'name subject' }).lean();
    if (!invite) return res.status(404).json({ message: 'This invitation link is invalid or has been revoked.' });
    if (invite.status !== 'pending') return res.status(410).json({ message: 'This invitation is no longer pending (' + invite.status + ').' });
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return res.status(410).json({ message: 'This invitation has expired.' });
    const owner = await User.findById(invite.ownerId).select('tuitionName name').lean();
    res.json({ success: true, data: { name: invite.name, email: invite.email, expiresAt: invite.expiresAt, academy: (owner && (owner.tuitionName || owner.name)) || 'Your academy', batches: (invite.batchIds || []).map((b) => (b && b.name ? { id: String(b._id), name: b.name, subject: b.subject || '' } : b)), role: 'student' } });
  } catch (e) { next(e); }
};

const acceptPublicInvite = async (req, res, next) => {
  try {
    const token = String(req.params.token || '');
    if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ message: 'This invitation link is invalid.' });
    const { password, phone } = req.body || {};
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Choose a password of 8 to 128 characters.' });
    const invite = await StudentInvitation.findOne({ tokenHash: hash(token) });
    if (!invite) return res.status(404).json({ message: 'This invitation link is invalid or has been revoked.' });
    if (invite.status !== 'pending') return res.status(410).json({ message: 'This invitation is no longer pending (' + invite.status + ').' });
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return res.status(410).json({ message: 'This invitation has expired.' });
    const email = String(invite.email).toLowerCase();
    const existingUser = await User.findOne({ email }).select('_id');
    if (existingUser) {
      invite.status = 'accepted'; invite.acceptedAt = new Date(); await invite.save();
      return res.status(409).json({ message: 'This email is already registered. Please sign in instead.' });
    }
    const owner = await User.findById(invite.ownerId).select('tuitionName name');
    const cleanPhone = typeof phone === 'string' && phone.trim() ? phone.trim().slice(0, 30) : (invite.phone || '');
    const student = await User.create({
      tuitionName: (owner && (owner.tuitionName || owner.name)) || 'Academy',
      name: invite.name,
      email,
      phone: cleanPhone || '0000000000',
      password,
      role: 'student',
      ownerId: invite.ownerId,
      batchIds: invite.batchIds || [],
    });
    invite.status = 'accepted'; invite.acceptedAt = new Date(); await invite.save();
    const authToken = student.generateAuthToken();
    res.status(201).json({ success: true, message: 'Welcome! Your student login is ready.', data: { user: { id: student._id, name: student.name, email: student.email, role: student.role }, token: authToken } });
  } catch (e) { next(e); }
};

module.exports = { list, create, resend, cancel, getPublicInvite, acceptPublicInvite };



