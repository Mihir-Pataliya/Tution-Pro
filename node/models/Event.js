const mongoose = require('mongoose');
const EventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  academyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  category: { type: String, enum: ['Exam','Holiday','Class','Fee Deadline','Parent Meeting','Celebration','Festival','Annual Day','Sports Day','Competition','Workshop','Seminar','Guest Lecture','Educational Trip / Picnic','Orientation','Admission Event','Result Declaration','Parent-Teacher Activity','Staff Meeting','Teacher Training','Birthday Celebration','Farewell','Other'], default: 'Other' },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  startTime: { type: String, default: '' },
  endTime: { type: String, default: '' },
  location: { type: String, default: '' },
  audience: { type: String, enum: ['academy','batches','teachers'], default: 'academy' },
  batchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  teacherIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  status: { type: String, enum: ['draft','published'], default: 'published' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
module.exports = mongoose.model('Event', EventSchema);
