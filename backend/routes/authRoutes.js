const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const requireAuth = require('../middlewares/authMiddleware');

router.post('/password-reset', authController.sendPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.post('/login-request', authController.loginRequest);
router.post('/verify-login-otp', authController.verifyLoginOtp);
router.post('/signup-otp', authController.signupOtp);
router.post('/verify-signup-otp', authController.verifySignupOtp);
router.post('/verify-magic-token', authController.verifyMagicToken);

// Admin routes
router.post('/admin', requireAuth, authController.createAdmin);
router.post('/contact/reply', requireAuth, authController.sendContactReply);

module.exports = router;
