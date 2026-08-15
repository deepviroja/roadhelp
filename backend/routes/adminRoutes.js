const express = require('express');
const router = express.Router();
const { deleteUsersByRole } = require('../controllers/adminController');
const requireAuth = require('../middlewares/authMiddleware');

// Super admin only: bulk delete route
router.post('/bulk-delete', requireAuth, deleteUsersByRole);

module.exports = router;
