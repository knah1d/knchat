import express from 'express';
import { requestLogger, securityHeaders } from '../middleware/auth.js';
import { registerUser, loginUser, logoutUser, checkAuth } from '../controllers/authController.js';

const router = express.Router();

// Debug middleware for auth routes
router.use(requestLogger);
router.use(securityHeaders);

// Check authentication status
router.get('/check-auth', checkAuth);

// Register
router.post('/register', registerUser);

// Login 
router.post('/login', loginUser);

// Logout
router.post('/logout', logoutUser);

export default router;