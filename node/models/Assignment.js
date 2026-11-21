const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    title: { type: String, required: [true, 'Assignment title is required'], trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    dueDate: { type: Date, default: null },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
  },
  { timestamps: true }
);

assignmentSchema.index({ ownerId: 1, teacherId: 1, createdAt: -1 });
assignmentSchema.index({ batchId: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);

