const express = require('express');

const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const chatController = require('../controllers/chat.controller');

router.post('/', authMiddleware, chatController.chat);
router.post('/stream', authMiddleware, chatController.stream);
router.post('/stop', authMiddleware, chatController.stop);
router.get('/status/:generationId', authMiddleware, chatController.status);

module.exports = router;
