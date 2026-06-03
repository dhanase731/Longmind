const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const governanceController = require('../controllers/governance.controller');

router.get('/mode', authMiddleware, governanceController.getMode);
router.post('/mode', authMiddleware, governanceController.setMode);

module.exports = router;
