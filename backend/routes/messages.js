import express from 'express';
import { isAuthenticated, requestLogger } from '../middleware/auth.js';
import { getRecentMessages } from '../controllers/messageController.js';

const router = express.Router();

// Debug middleware for message routes
router.use(requestLogger);

// Get recent messages
router.get('/', getRecentMessages);

export default router; 