const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const studentInviteController = require('../controllers/studentInviteController');

const router = express.Router();

router.get('/public/:token', studentInviteController.getPublicInvite);
router.post('/public/:token/accept', studentInviteController.acceptPublicInvite);

router.use(requireAuth);
router.get('/', studentInviteController.list);
router.post('/', studentInviteController.create);
router.post('/:id/resend', studentInviteController.resend);
router.post('/:id/cancel', studentInviteController.cancel);

module.exports = router;