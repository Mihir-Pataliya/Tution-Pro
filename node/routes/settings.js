const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireOwner = require('../middleware/requireOwner');
const settingsController = require('../controllers/settingsController');

const router = express.Router();
router.use(requireAuth, requireOwner);
router.get('/', settingsController.getSettings);
router.put('/profile', settingsController.updateProfile);
router.put('/notifications', settingsController.updateNotifications);
router.put('/permissions', settingsController.updatePermissions);
router.put('/subscription', settingsController.updateSubscription);
router.put('/password', settingsController.changePassword);

module.exports = router;
