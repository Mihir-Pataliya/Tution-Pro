const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    title: { type: String, required: [true, 'Material title is required'], trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    type: { type: String, enum: ['link', 'note', 'file'], default: 'link' },
    url: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true }
);

studyMaterialSchema.index({ ownerId: 1, teacherId: 1, createdAt: -1 });
studyMaterialSchema.index({ batchId: 1 });

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);

