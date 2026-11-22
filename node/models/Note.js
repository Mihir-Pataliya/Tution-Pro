const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    color: {
      type: String,
      default: 'amber',
      enum: ['amber', 'emerald', 'sky', 'violet', 'rose', 'slate'],
    },
  },
  { timestamps: true }
);

noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
