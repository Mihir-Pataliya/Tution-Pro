const Student = require('../models/Student');
const Batch = require('../models/Batch');
const User = require('../models/User');
const Enquiry = require('../models/Enquiry');

// GET /students?batchId=
const getAllStudents = async (req, res) => {
  try {
    const { batchId } = req.query;
    let filter = { userId: req.user.id };
    if (batchId) {
      filter.batchId = batchId;
    }
    const students = await Student.find(filter)
      .populate({ path: 'batchId', select: 'name timing timings', match: { userId: req.user.id } })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: students });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
};

// POST /students
const createStudent = async (req, res) => {
  try {
    const { name, parentName, parentPhone, batchId, monthlyFee } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Student name is required' });
    }
    if (!batchId) {
      return res.status(400).json({ message: 'Batch is required' });
    }

    const ownedBatch = await Batch.findOne({ _id: batchId, userId: req.user.id }).select('_id');
    if (!ownedBatch) {
      return res.status(400).json({ message: 'Batch not found' });
    }

    const [owner, studentCount] = await Promise.all([
      User.findById(req.user.id).select('studentLimit subscriptionExpiresAt'),
      Student.countDocuments({ userId: req.user.id }),
    ]);
    if (owner?.studentLimit !== undefined && studentCount >= owner.studentLimit) {
      return res.status(403).json({ message: `Your plan allows up to ${owner.studentLimit} students. Update your subscription limits to add more.` });
    }
    if (owner?.subscriptionExpiresAt && owner.subscriptionExpiresAt < new Date()) {
      return res.status(403).json({ message: 'Your subscription has expired. Update your plan settings to add students.' });
    }

    // Create new student
    const student = await Student.create({
      userId: req.user.id,
      name,
      parentName: parentName || '',
      parentPhone: parentPhone || '',
      batchId,
      monthlyFee: monthlyFee !== undefined ? parseFloat(monthlyFee) : 0,
    });

    // Populate batchId for response
    const populatedStudent = await Student.findOne({ _id: student._id, userId: req.user.id }).populate({ path: 'batchId', select: 'name timing timings', match: { userId: req.user.id } });

    res.status(201).json({ success: true, message: 'Student created successfully', data: populatedStudent });
  } catch (error) {
    console.error('Create student error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Failed to create student' });
  }
};

// PUT /students/:id
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentName, parentPhone, batchId, monthlyFee } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Student name is required' });
    }
    if (!batchId) {
      return res.status(400).json({ message: 'Batch is required' });
    }

    const ownedBatch = await Batch.findOne({ _id: batchId, userId: req.user.id }).select('_id');
    if (!ownedBatch) {
      return res.status(400).json({ message: 'Batch not found' });
    }

    // Find and update student
    const student = await Student.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      {
        name,
        parentName: parentName || '',
        parentPhone: parentPhone || '',
        batchId,
        monthlyFee: monthlyFee !== undefined ? parseFloat(monthlyFee) : 0,
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Populate batchId for response
    const populatedStudent = await Student.findOne({ _id: student._id, userId: req.user.id }).populate({ path: 'batchId', select: 'name timing timings', match: { userId: req.user.id } });

    res.json({ success: true, message: 'Student updated successfully', data: populatedStudent });
  } catch (error) {
    console.error('Update student error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Failed to update student' });
  }
};

// DELETE /students/:id
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete student
    const student = await Student.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.enquiryId) {
      await Enquiry.updateOne(
        { _id: student.enquiryId, userId: req.user.id, convertedStudentId: student._id },
        { $set: { status: 'contacted', convertedStudentId: null, convertedAt: null } }
      );
    }

    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ message: 'Failed to delete student' });
  }
};

module.exports = { getAllStudents, createStudent, updateStudent, deleteStudent };
