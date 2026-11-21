const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema(
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
    },
    amount: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paidDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'overdue'],
      default: 'pending',
    },
    installmentNumber: { type: Number, default: 1 },
    installmentCount: { type: Number, default: 1 },
    installmentPlanId: { type: mongoose.Schema.Types.ObjectId, default: null },
    paidAmount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

feeSchema.index({ userId: 1, status: 1 });
feeSchema.index({ studentId: 1 });
feeSchema.index({ batchId: 1 });

module.exports = mongoose.model('Fee', feeSchema);