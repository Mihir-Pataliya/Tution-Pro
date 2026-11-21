const Batch = require('../models/Batch');
const User = require('../models/User');

// GET /batches - Get all batches for the authenticated user
const getAllBatches = async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const batches = await Batch.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: batches.map((batch) => ({ ...batch.toObject(), timing: batch.timings || '' })) });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({ message: 'Failed to fetch batches' });
  }
};

// POST /batches - Create a new batch
const createBatch = async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { name, subject, timing, timings } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Batch name is required' });
    }

    const [owner, batchCount] = await Promise.all([
      User.findById(req.user.id).select('batchLimit subscriptionExpiresAt'),
      Batch.countDocuments({ userId: req.user.id }),
    ]);
    if (owner?.batchLimit !== undefined && batchCount >= owner.batchLimit) {
      return res.status(403).json({ message: `Your plan allows up to ${owner.batchLimit} batches. Update your subscription limits to add more.` });
    }
    if (owner?.subscriptionExpiresAt && owner.subscriptionExpiresAt < new Date()) {
      return res.status(403).json({ message: 'Your subscription has expired. Update your plan settings to add batches.' });
    }

    // Create new batch
    const batch = await Batch.create({
      userId: req.user.id,
      name,
      subject: subject || '',
      timings: timings || timing || '',
    });

    res.status(201).json({ success: true, message: 'Batch created successfully', data: { ...batch.toObject(), timing: batch.timings } });
  } catch (error) {
    console.error('Create batch error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Failed to create batch' });
  }
};

// PUT /batches/:id - Update a batch
const updateBatch = async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { id } = req.params;
    const { name, subject, timing, timings } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Batch name is required' });
    }

    // Find and update batch
    const batch = await Batch.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { name, subject: subject || '', timings: timings || timing || '' },
      { returnDocument: 'after', runValidators: true }
    );

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    res.json({ success: true, message: 'Batch updated successfully', data: { ...batch.toObject(), timing: batch.timings } });
  } catch (error) {
    console.error('Update batch error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Failed to update batch' });
  }
};

// DELETE /batches/:id - Delete a batch
const deleteBatch = async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { id } = req.params;

    // Find and delete batch
    const batch = await Batch.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    res.json({ success: true, message: 'Batch deleted successfully' });
  } catch (error) {
    console.error('Delete batch error:', error);
    res.status(500).json({ message: 'Failed to delete batch' });
  }
};

module.exports = { getAllBatches, createBatch, updateBatch, deleteBatch };
