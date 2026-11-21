const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    tuitionName: {
      type: String,
      required: [true, 'Tuition center name is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'teacher', 'student'],
      default: 'owner',
    },
    // For staff accounts (teacher/admin) created via invitation: academy owner they belong to.
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    subject: { type: String, trim: true, maxlength: 120, default: '' },
    batchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
    isActive: {
      type: Boolean,
      default: true,
    },
    academyAddress: { type: String, trim: true, maxlength: 300, default: '' },
    academyWebsite: { type: String, trim: true, maxlength: 200, default: '' },
    academyLogo: { type: String, maxlength: 2800000, default: '' },
    notificationPreferences: {
      enquiries: { type: Boolean, default: true },
      followUps: { type: Boolean, default: true },
      fees: { type: Boolean, default: true },
      attendance: { type: Boolean, default: true },
    },
    rolePermissions: {
      admin: { type: [String], default: ['students', 'batches', 'attendance', 'fees', 'enquiries'] },
      teacher: { type: [String], default: ['students', 'attendance'] },
    },
    subscriptionPlan: { type: String, enum: ['free', 'starter', 'growth', 'pro'], default: 'starter' },
    subscriptionExpiresAt: { type: Date, default: null },
    studentLimit: { type: Number, min: 0, max: 100000, default: 50 },
    batchLimit: { type: Number, min: 0, max: 10000, default: 5 },
    teacherLimit: { type: Number, min: 0, max: 10000, default: 0 },
    // Monthly salary for teachers (payroll). Applies to role === 'teacher'.
    monthlySalary: { type: Number, min: 0, default: 0 },
    authVersion: { type: Number, default: 0, select: false },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    throw err;
  }
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
  const jwt = require('jsonwebtoken');
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be configured before issuing authentication tokens');
  }
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role, authVersion: this.authVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

module.exports = mongoose.model('User', userSchema);
