const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const requireAuth = require('../middleware/requireAuth');
const requireOwner = require('../middleware/requireOwner');

router.get('/dashboard-stats', requireAuth, requireOwner, dashboardController.getDashboardStats);
router.get('/dashboard/overview', requireAuth, requireOwner, dashboardController.getDashboardOverview);
router.post('/dashboard/copilot', requireAuth, requireOwner, dashboardController.askCopilot);

module.exports = router;
