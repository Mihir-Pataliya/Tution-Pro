const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    invitedByRole: { type: String, enum: ['owner', 'teacher'], default: 'owner' },
    name: { type: String, required: [true, 'Student name is required'], trim: true, maxlength: 100 },
    email: { type: String, required: [true, 'Email is required'], lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'] },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    batchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
    tokenHash: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'accepted', 'expired', 'cancelled'], default: 'pending' },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    lastSentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

invitationSchema.index({ ownerId: 1, createdAt: -1 });
invitationSchema.index({ ownerId: 1, email: 1 });
invitationSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('StudentInvitation', invitationSchema);