const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');

// @desc    Register new user
// @route   POST /api/auth/register
router.post('/register', authController.register);

// @desc    Login user
// @route   POST /api/auth/login
router.post('/login', authController.login);

// @desc    Get the authenticated user
// @route   GET /api/auth/me
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
