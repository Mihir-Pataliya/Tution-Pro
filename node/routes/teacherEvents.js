const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { getTeacherEvents } = require('../controllers/teacherEventsController');
router.use(requireAuth);
router.get('/', getTeacherEvents);
module.exports = router;
