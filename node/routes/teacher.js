const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const teacherController = require('../controllers/teacherController');

const requireTeacher = (req, res, next) => {
  if (!req.user || !['teacher', 'owner', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Teacher access required' });
  }
  return next();
};

router.use(requireAuth, requireTeacher);

router.get('/profile', teacherController.getProfile);
router.put('/profile', teacherController.updateProfile);
router.put('/password', teacherController.changePassword);

router.get('/overview', teacherController.getOverview);
router.get('/batches', teacherController.getBatches);
router.get('/students', teacherController.getStudents);

router.get('/attendance', teacherController.getAttendance);
router.put('/attendance', teacherController.markAttendance);

router.get('/assignments', teacherController.getAssignments);
router.post('/assignments', teacherController.createAssignment);
router.put('/assignments/:id', teacherController.updateAssignment);
router.delete('/assignments/:id', teacherController.deleteAssignment);

router.get('/materials', teacherController.getMaterials);
router.post('/materials', teacherController.createMaterial);
router.delete('/materials/:id', teacherController.deleteMaterial);

router.get('/recipients', teacherController.getRecipients);
router.get('/messages', teacherController.getMessages);
router.post('/messages', teacherController.sendMessage);
router.put('/messages/:id/read', teacherController.markMessageRead);

module.exports = router;

