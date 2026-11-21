const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireStudent = require('../middleware/requireStudent');
const c = require('../controllers/studentPortalController');

router.use(requireAuth, requireStudent);

router.get('/profile', c.getProfile);
router.put('/profile', c.updateProfile);
router.put('/password', c.changePassword);
router.get('/settings', c.getSettings);
router.put('/settings', c.updateSettings);

router.get('/overview', c.getOverview);
router.get('/batches', c.getBatches);
router.get('/attendance', c.getAttendance);
router.get('/assignments', c.getAssignments);
router.get('/materials', c.getMaterials);
router.get('/timetable', c.getTimetable);
router.get('/fees', c.getFees);

router.get('/messages', c.getMessages);
router.get('/recipients', c.getRecipients);
router.post('/messages', c.sendMessage);
router.put('/messages/:id/read', c.markMessageRead);

module.exports = router;