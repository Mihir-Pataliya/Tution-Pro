const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const Batch = require('../models/Batch');

const permissions = ['students', 'batches', 'attendance', 'fees', 'enquiries', 'settings'];
const plans = ['free', 'starter', 'growth', 'pro'];

const settingsView = (user) => ({
  profile: {
    academyName: user.tuitionName,
    ownerName: user.name,
    email: user.email,
    phone: user.phone,
    address: user.academyAddress || '',
    website: user.academyWebsite || '',
    logo: user.academyLogo || '',
  },
  notifications: user.notificationPreferences,
  permissions: user.rolePermissions,
  subscription: {
    plan: user.subscriptionPlan,
    expiresAt: user.subscriptionExpiresAt,
    limits: { students: user.studentLimit, batches: user.batchLimit, teachers: user.teacherLimit },
  },
});

const getSettings = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'Owner account not found' });
  res.json({ success: true, data: settingsView(user) });
};

const updateProfile = async (req, res) => {
  const { academyName, ownerName, email, phone, address = '', website = '', logo = '' } = req.body || {};
  if (![academyName, ownerName, email, phone].every((value) => typeof value === 'string' && value.trim())) {
    return res.status(400).json({ message: 'Academy name, owner name, email, and phone are required.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (!/^[+\d().\-\s]{7,30}$/.test(phone.trim()) || !/\d/.test(phone)) return res.status(400).json({ message: 'Enter a valid contact phone number.' });
  if ([academyName, ownerName, phone].some((value) => value.trim().length > 100)) return res.status(400).json({ message: 'Name and phone fields must be 100 characters or fewer.' });
  if (typeof address !== 'string' || address.length > 300 || typeof website !== 'string' || website.length > 200) return res.status(400).json({ message: 'Address or website exceeds the allowed length.' });
  if (website.trim()) {
    try {
      const parsed = new URL(website.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
    } catch {
      return res.status(400).json({ message: 'Enter a website URL beginning with https:// or http://.' });
    }
  }
  if (typeof logo !== 'string' || logo.length > 2800000 || (logo && !/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+=*$/i.test(logo))) {
    return res.status(400).json({ message: 'Logo must be a PNG, JPEG, or WebP image under 2 MB.' });
  }
  try {
    const duplicate = await User.findOne({ email: cleanEmail, _id: { $ne: req.user.id } }).select('_id');
    if (duplicate) return res.status(409).json({ message: 'That email address is already in use.' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Owner account not found' });
    user.tuitionName = academyName.trim();
    user.name = ownerName.trim();
    user.email = cleanEmail;
    user.phone = phone.trim();
    user.academyAddress = address.trim();
    user.academyWebsite = website.trim();
    user.academyLogo = logo;
    await user.save();
    res.json({ success: true, message: 'Academy profile saved.', data: settingsView(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'That email address is already in use.' });
    if (error.name === 'ValidationError') return res.status(400).json({ message: Object.values(error.errors).map((item) => item.message).join(', ') });
    throw error;
  }
};

const updateNotifications = async (req, res) => {
  const input = req.body?.notifications;
  const keys = ['enquiries', 'followUps', 'fees', 'attendance'];
  if (!input || keys.some((key) => typeof input[key] !== 'boolean')) return res.status(400).json({ message: 'Choose a valid on/off value for each notification.' });
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'Owner account not found' });
  user.notificationPreferences = Object.fromEntries(keys.map((key) => [key, input[key]]));
  await user.save();
  res.json({ success: true, data: { notifications: user.notificationPreferences } });
};

const updatePermissions = async (req, res) => {
  const input = req.body?.permissions;
  if (!input || !['admin', 'teacher'].every((role) => Array.isArray(input[role]))) return res.status(400).json({ message: 'Provide permissions for admin and teacher roles.' });
  for (const role of ['admin', 'teacher']) {
    if (input[role].some((permission) => !permissions.includes(permission)) || new Set(input[role]).size !== input[role].length) {
      return res.status(400).json({ message: 'One or more permissions are invalid.' });
    }
  }
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'Owner account not found' });
  user.rolePermissions = { admin: input.admin, teacher: input.teacher };
  await user.save();
  res.json({ success: true, data: { permissions: user.rolePermissions } });
};

const updateSubscription = async (req, res) => {
  const { plan, expiresAt, limits } = req.body || {};
  if (!plans.includes(plan)) return res.status(400).json({ message: 'Choose a valid subscription plan.' });
  if (!limits || !['students', 'batches', 'teachers'].every((key) => Number.isInteger(Number(limits[key])) && Number(limits[key]) >= 0 && Number(limits[key]) <= 100000)) {
    return res.status(400).json({ message: 'Plan limits must be whole numbers from 0 to 100,000.' });
  }
  let expiry = null;
  if (expiresAt) {
    expiry = new Date(expiresAt);
    if (Number.isNaN(expiry.getTime())) return res.status(400).json({ message: 'Enter a valid subscription expiry date.' });
    if (/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) expiry.setUTCHours(23, 59, 59, 999);
  }
  const [studentCount, batchCount] = await Promise.all([
    Student.countDocuments({ userId: req.user.id }),
    Batch.countDocuments({ userId: req.user.id }),
  ]);
  if (Number(limits.students) < studentCount || Number(limits.batches) < batchCount) {
    return res.status(400).json({ message: 'Limits cannot be lower than your current student or batch count.' });
  }
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'Owner account not found' });
  user.subscriptionPlan = plan;
  user.subscriptionExpiresAt = expiry;
  user.studentLimit = Number(limits.students);
  user.batchLimit = Number(limits.batches);
  user.teacherLimit = Number(limits.teachers);
  await user.save();
  res.json({ success: true, message: 'Subscription settings saved.', data: { subscription: settingsView(user).subscription } });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ message: 'Enter your current password and a new password of 8 to 128 characters.' });
  }
  const user = await User.findById(req.user.id).select('+password +authVersion');
  if (!user) return res.status(404).json({ message: 'Owner account not found' });
  if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(400).json({ message: 'Current password is incorrect.' });
  if (currentPassword === newPassword) return res.status(400).json({ message: 'Choose a new password that differs from your current password.' });
  user.password = newPassword;
  user.authVersion = (user.authVersion || 0) + 1;
  await user.save();
  res.json({ success: true, message: 'Password changed.', data: { token: user.generateAuthToken() } });
};

module.exports = { getSettings, updateProfile, updateNotifications, updatePermissions, updateSubscription, changePassword };
