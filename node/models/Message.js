const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
    recipientType: { type: String, enum: ['owner', 'admin', 'teacher', 'student', 'parent'], default: 'owner' },
  subject: { type: String, trim: true, maxlength: 200, default: '' },
  recipientName: { type: String, trim: true, maxlength: 200, default: '' },
    content: { type: String, required: [true, 'Message content is required'], trim: true, maxlength: 4000 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ ownerId: 1, recipientId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);

