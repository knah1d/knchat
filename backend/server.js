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
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Allow both development and production origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'https://knahid.netlify.app'
].filter(Boolean);

console.log('Allowed Origins:', allowedOrigins);

// Middleware
app.set('trust proxy', 1); // trust first proxy

app.use(cors({
  origin: function(origin, callback) {
    console.log('Request Origin:', origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: 'chat-app-secret',
  name: 'sessionId',
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60, // 1 day
    autoRemove: 'native'
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    secure: true,
    httpOnly: true,
    sameSite: 'none',
    path: '/'
  },
  rolling: true,
  resave: true,
  saveUninitialized: false,
  proxy: true
}));

// Add headers for better cookie handling
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Debug middleware with more details
app.use((req, res, next) => {
  console.log('Request Details:', {
    method: req.method,
    path: req.path,
    origin: req.get('origin'),
    headers: req.headers,
    cookies: req.cookies,
    sessionID: req.sessionID,
    session: req.session,
    user: req.session?.user
  });
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Store typing users
let typingUsers = new Set();

// Check session status
app.get('/api/check-auth', (req, res) => {
  if (req.session.user) {
    res.json({ isAuthenticated: true, username: req.session.user.username });
  } else {
    res.json({ isAuthenticated: false });
  }
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

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create new user with plain password
    const user = new User({ username, password });
    await user.save();

    // Set session after successful registration
    req.session.user = { username: user.username };
    
    res.status(201).json({ username });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username, password });
    if (!user) {
      console.log('Invalid credentials for username:', username);
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Set session data
    req.session.user = { 
      username: user.username,
      id: user._id 
    };

    // Force session save
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: 'Error saving session' });
      }

      console.log('Login successful. Session:', {
        id: req.sessionID,
        user: req.session.user,
        cookie: req.session.cookie
      });

      // Set cookie explicitly
      res.cookie('sessionId', req.sessionID, {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/'
      });

      res.json({ 
        username: user.username,
        sessionId: req.sessionID
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log('New client connected');

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
      const message = new Message({
        content: messageData.content,
        username: messageData.username,
        timestamp: new Date()
      });
      
      await message.save();
      io.emit('message', message);
      
      // Clear typing status when message is sent
      typingUsers.delete(messageData.username);
      io.emit('typing-update', Array.from(typingUsers));
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  // Handle typing status
  socket.on('typing-start', (username) => {
    typingUsers.add(username);
    io.emit('typing-update', Array.from(typingUsers));
  });

  socket.on('typing-end', (username) => {
    typingUsers.delete(username);
    io.emit('typing-update', Array.from(typingUsers));
  });

  socket.on('disconnect', () => {
    // Clean up typing status when user disconnects
    const disconnectedUser = Array.from(typingUsers).find(username => 
      socket.handshake.query.username === username
    );
    if (disconnectedUser) {
      typingUsers.delete(disconnectedUser);
      io.emit('typing-update', Array.from(typingUsers));
    }
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 