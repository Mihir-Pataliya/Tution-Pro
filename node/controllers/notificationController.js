const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');

const getAcademyId = (user) => user.role === 'owner' ? user._id : user.ownerId;

const listNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role ownerId').lean();
    const academyId = getAcademyId(user);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const filter = { recipientId: req.user.id };
    if (req.query.unread === 'true') filter.isRead = false;
    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).lean(),
      Notification.countDocuments(filter),
    ]);
    res.json({ success: true, data: { items, total, page, limit } });
  } catch (e) { res.status(500).json({ message: 'Failed to fetch notifications' }); }
};

const unreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipientId: req.user.id, isRead: false });
    res.json({ success: true, data: { count } });
  } catch (e) { res.status(500).json({ message: 'Failed to fetch unread count' }); }
};

const markRead = async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate({ _id: req.params.id, recipientId: req.user.id }, { isRead: true }, { new: true });
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    res.json({ success: true, data: n });
  } catch (e) { res.status(500).json({ message: 'Failed to mark notification' }); }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipientId: req.user.id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: 'Failed to mark all' }); }
};

module.exports = { listNotifications, unreadCount, markRead, markAllRead };
