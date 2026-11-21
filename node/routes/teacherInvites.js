const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireOwner = require('../middleware/requireOwner');
const teacherInviteController = require('../controllers/teacherInviteController');

const router = express.Router();

// Public invite links (no login): teacher opens email link.
router.get('/public/:token', teacherInviteController.getPublicInvite);
router.post('/public/:token/accept', teacherInviteController.acceptPublicInvite);

router.use(requireAuth, requireOwner);
router.get('/', teacherInviteController.list);
router.post('/', teacherInviteController.create);
router.post('/:id/resend', teacherInviteController.resend);
router.post('/:id/cancel', teacherInviteController.cancel);

module.exports = router;
