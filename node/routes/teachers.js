const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireOwner = require('../middleware/requireOwner');
const teachersCtrl = require('../controllers/teachersController');

router.use(requireAuth, requireOwner);
router.get('/', teachersCtrl.listTeachers);

module.exports = router;
