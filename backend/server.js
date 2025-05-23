import express from 'express';
import cors from 'cors';
import http from 'http';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';

// Initialize dotenv
dotenv.config();

// Import configuration and services
import { connectMongoDB } from './config/db.js';
import { getOrigins, corsOptions } from './config/app.js';
import { setupSessionStore, createSessionMiddleware } from './services/sessionService.js';
import { setupSocketIO } from './services/socketService.js';
import { logEnvironment, createResponse } from './utils/logger.js';
import { securityHeaders, requestLogger } from './middleware/auth.js';

// Initialize express app and server
const app = express();
const server = http.createServer(app);

// Log environment settings
logEnvironment();

// Get allowed origins based on environment
const allowedOrigins = getOrigins();
console.log('Allowed Origins:', allowedOrigins);

// Middleware order is important!
app.set('trust proxy', 1); // trust first proxy

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply CORS configuration
app.use(cors(corsOptions(allowedOrigins)));

// Connect to MongoDB
connectMongoDB();

// Setup session store and middleware
const sessionStore = setupSessionStore(process.env.MONGODB_URI);
app.use(createSessionMiddleware(sessionStore));

// Add security headers
app.use(securityHeaders);

// Debug middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(requestLogger);
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json(createResponse(
    true, 
    'Server is healthy',
    { 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      origins: allowedOrigins,
      session: {
        enabled: true,
        store: 'MongoDB',
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          httpOnly: true
        }
      }
    }
  ));
});

// API Routes
app.use('/api', authRoutes);
app.use('/api/messages', messageRoutes);

// Setup Socket.IO
const io = setupSocketIO(server, allowedOrigins);

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export { app, server };
