const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'present',
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ userId: 1, date: -1 });
attendanceSchema.index({ studentId: 1 });
attendanceSchema.index({ batchId: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);