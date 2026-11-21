const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const requireAuth = require('../middleware/requireAuth');
const requireOwner = require('../middleware/requireOwner');

const router = express.Router();
router.use(requireAuth, requireOwner);
router.get('/', attendanceController.getBatchAttendance);
router.get('/history', attendanceController.getAttendanceHistory);
router.put('/', attendanceController.markBatchAttendance);

module.exports = router;
