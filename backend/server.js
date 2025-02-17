const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const User = require('./models/User');
const Message = require('./models/Message');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Add environment logging at the top after imports
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not Set',
  FRONTEND_URL: process.env.FRONTEND_URL,
});

// Allow both development and production origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'https://knchat.netlify.app',
  'https://knchat.onrender.com'
].filter(Boolean);

console.log('Allowed Origins:', allowedOrigins);

// Middleware order is important!
app.set('trust proxy', 1); // trust first proxy

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
const corsOptions = {
  origin: function(origin, callback) {
    console.log('CORS Request Origin:', origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error('CORS Error - Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['set-cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// MongoDB Connection with retry
const connectMongoDB = async (retries = 5) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    if (retries === 0) {
      console.error('MongoDB connection failed after retries:', err);
      process.exit(1);
    }
    console.log(`MongoDB connection attempt failed. Retrying... (${retries} attempts left)`);
    setTimeout(() => connectMongoDB(retries - 1), 5000);
  }
};

connectMongoDB();

// Session store setup with error handling
const sessionStore = MongoStore.create({ 
  mongoUrl: process.env.MONGODB_URI,
  ttl: 24 * 60 * 60, // 1 day
  autoRemove: 'native',
  touchAfter: 24 * 3600, // time period in seconds between session updates
  stringify: false,
  crypto: {
    secret: 'chat-app-secret'
  }
});

sessionStore.on('error', function(error) {
  console.error('Session store error:', error);
});

// Session configuration
const sessionConfig = {
  secret: 'chat-app-secret',
  name: 'connect.sid',
  store: sessionStore,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  },
  rolling: true,
  resave: false,
  saveUninitialized: false,
  proxy: true
};

// Debug session store
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

app.use(session(sessionConfig));

// Add security headers
app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': req.headers.origin || req.headers.referer,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Debug middleware
app.use((req, res, next) => {
  console.log('Request Debug:', {
    url: req.url,
    method: req.method,
    sessionID: req.sessionID,
    hasSession: !!req.session,
    cookies: req.cookies,
    headers: {
      origin: req.get('origin'),
      referer: req.get('referer'),
      cookie: req.get('cookie')
    }
  });
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy', 
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
  });
});

// Use auth routes
app.use('/api', authRoutes);

// Initialize Socket.IO with CORS settings
const io = socketIo(server, {
  cors: {
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  }
});

// Store typing users
let typingUsers = new Set();

// Socket.IO connection handling
io.on('connection', async (socket) => {
  const username = socket.handshake.query.username;
  console.log('New client connected:', username);

  try {
    // Send existing messages to newly connected client
    const messages = await Message.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    socket.emit('previous-messages', messages.reverse());
  } catch (error) {
    console.error('Error fetching messages for new connection:', error);
  }

  // Handle new messages
  socket.on('message', async (messageData) => {
    try {
      console.log('New message received:', messageData);
      
      const message = new Message({
        content: messageData.content,
        username: messageData.username,
        timestamp: new Date()
      });
      
      await message.save();
      console.log('Message saved:', message);
      
      // Broadcast the message to all connected clients
      io.emit('message', {
        content: message.content,
        username: message.username,
        timestamp: message.timestamp
      });
      
      // Clear typing status when message is sent
      typingUsers.delete(messageData.username);
      io.emit('typing-update', Array.from(typingUsers));
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('error', { message: 'Error saving message' });
    }
  });

  // Handle typing status
  socket.on('typing-start', (username) => {
    console.log('User started typing:', username);
    typingUsers.add(username);
    io.emit('typing-update', Array.from(typingUsers));
  });

  socket.on('typing-end', (username) => {
    console.log('User stopped typing:', username);
    typingUsers.delete(username);
    io.emit('typing-update', Array.from(typingUsers));
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', username);
    if (username) {
      typingUsers.delete(username);
      io.emit('typing-update', Array.from(typingUsers));
    }
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Get recent messages
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 