const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const memoryController = require('../controllers/memory.controller');

router.get('/', authMiddleware, memoryController.list);
router.delete('/all', authMiddleware, memoryController.deleteAll);
router.delete('/session/:sessionId', authMiddleware, memoryController.deleteBySession);
router.delete('/:id', authMiddleware, memoryController.deleteById);

module.exports = router;
