const mongoose = require('mongoose');
const NotificationSchema = new mongoose.Schema({
  academyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipientRole: { type: String, enum: ['Owner','Teacher','Student'], required: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: { type: String, enum: ['EVENT','ANNOUNCEMENT','SYSTEM'], default: 'SYSTEM' },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  isRead: { type: Boolean, default: false, index: true },
}, { timestamps: true });
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ academyId: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', NotificationSchema);
