const mongoose = require('mongoose');
const Note = require('../models/Note');

// GET /api/notes - list notes for logged-in owner
const getNotes = async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.id);
    const notes = await Note.find({ userId: ownerId }).sort({ updatedAt: -1, createdAt: -1 }).lean();
    res.json({ success: true, data: notes });
  } catch (error) {
    console.error('getNotes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notes' });
  }
};

// POST /api/notes - create note
const createNote = async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.id);
    const { title, description, color } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const note = await Note.create({
      userId: ownerId,
      title: title.trim(),
      description: description ? description.trim() : '',
      color: color || 'amber',
    });

    res.status(201).json({ success: true, data: note, message: 'Note created successfully' });
  } catch (error) {
    console.error('createNote error:', error);
    res.status(500).json({ success: false, message: 'Failed to create note' });
  }
};

// PUT /api/notes/:id - update note
const updateNote = async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.id);
    const { id } = req.params;
    const { title, description, color } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title cannot be empty' });
    }

    const updated = await Note.findOneAndUpdate(
      { _id: id, userId: ownerId },
      {
        title: title.trim(),
        description: description !== undefined ? description.trim() : '',
        ...(color ? { color } : {}),
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    res.json({ success: true, data: updated, message: 'Note updated successfully' });
  } catch (error) {
    console.error('updateNote error:', error);
    res.status(500).json({ success: false, message: 'Failed to update note' });
  }
};

// DELETE /api/notes/:id - delete note
const deleteNote = async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.id);
    const { id } = req.params;

    const deleted = await Note.findOneAndDelete({ _id: id, userId: ownerId });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    console.error('deleteNote error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete note' });
  }
};

module.exports = {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
};
