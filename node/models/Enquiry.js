const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentName: { type: String, required: true, trim: true, maxlength: 100 },
  studentAge: { type: Number, min: 2, max: 100 },
  parentName: { type: String, trim: true, maxlength: 100, default: '' },
  parentPhone: { type: String, required: true, trim: true, maxlength: 30 },
  parentEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
  interestedCourse: { type: String, trim: true, maxlength: 120, default: '' },
  followUpDate: { type: Date, default: null },
  status: { type: String, enum: ['new', 'contacted', 'demo_scheduled', 'converted', 'lost'], default: 'new', index: true },
  lostReason: { type: String, trim: true, maxlength: 80, default: '' },
  lostNotes: { type: String, trim: true, maxlength: 2000, default: '' },
  source: { type: String, trim: true, maxlength: 80, default: '' },
  convertedStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  recoveryHistory: [{ lostReason: String, lostAt: Date, recoveredAt: Date, newStatus: String }],
}, { timestamps: true });

enquirySchema.index({ userId: 1, createdAt: -1 });
enquirySchema.index({ userId: 1, followUpDate: 1 });

module.exports = mongoose.model('Enquiry', enquirySchema);
