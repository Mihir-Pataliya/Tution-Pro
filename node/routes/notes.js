const express = require('express');
const router = express.Router();
const { getNotes, createNote, updateNote, deleteNote } = require('../controllers/noteController');
const requireAuth = require('../middleware/requireAuth');
const requireOwner = require('../middleware/requireOwner');

router.use(requireAuth, requireOwner);

router.get('/', getNotes);
router.post('/', createNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

module.exports = router;
