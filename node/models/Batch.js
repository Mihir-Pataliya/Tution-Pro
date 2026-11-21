const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
    },
    timings: {
      type: String,
      trim: true,
    },
    days: {
      type: [String],
    },
    maxStudents: {
      type: Number,
      default: 30,
    },
    fees: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

batchSchema.index({ userId: 1 });

module.exports = mongoose.model('Batch', batchSchema);