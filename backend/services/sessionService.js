import session from 'express-session';
import MongoStore from 'connect-mongo';
import { getSessionConfig } from '../config/app.js';

// Create session store with MongoDB
const setupSessionStore = (mongoUri) => {
  // Session store setup with error handling
  const sessionStore = MongoStore.create({ 
    mongoUrl: mongoUri,
    ttl: 24 * 60 * 60, // 1 day
    autoRemove: 'native',
    touchAfter: 24 * 3600, // time period in seconds between session updates
    stringify: false,
    crypto: {
      secret: process.env.SESSION_CRYPTO_SECRET || 'chat-app-secret'
    }
  });

  sessionStore.on('error', function(error) {
    console.error('Session store error:', error);
  });

  // Debug session store in development
  if (process.env.NODE_ENV !== 'production') {
    sessionStore.on('create', function(sessionId) {
      console.log('Session created:', sessionId);
    });
    
    sessionStore.on('touch', function(sessionId) {
      console.log('Session touched:', sessionId);
    });
    
    sessionStore.on('destroy', function(sessionId) {
      console.log('Session destroyed:', sessionId);
    });
  }

  return sessionStore;
};

// Create session middleware
const createSessionMiddleware = (sessionStore) => {
  const sessionConfig = getSessionConfig(sessionStore);
  return session(sessionConfig);
};

export {
  setupSessionStore,
  createSessionMiddleware
};
