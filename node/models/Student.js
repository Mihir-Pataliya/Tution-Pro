const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    linkedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    age: { type: Number, min: 2, max: 100 },
    parentName: {
      type: String,
      trim: true,
    },
    parentPhone: {
      type: String,
      trim: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
    },
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enquiry',
      default: undefined,
    },
    monthlyFee: {
      type: Number,
      default: 0,
    },
    reportToken: {
      type: String,
      unique: true,
      default: () => Math.random().toString(36).substr(2, 9),
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

studentSchema.index({ userId: 1 });
studentSchema.index({ batchId: 1 });
studentSchema.index({ linkedUserId: 1 });
studentSchema.index({ enquiryId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Student', studentSchema);
