const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const requireAuth = require('../middleware/requireAuth');
const requireOwner = require('../middleware/requireOwner');

router.use(requireAuth, requireOwner);

// GET /api/students?batchId=
router.get('/', studentController.getAllStudents);

// POST /api/students
router.post('/', studentController.createStudent);

// PUT /api/students/:id
router.put('/:id', studentController.updateStudent);

// DELETE /api/students/:id
router.delete('/:id', studentController.deleteStudent);

module.exports = router;
