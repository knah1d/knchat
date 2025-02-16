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

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Simple session configuration
app.use(session({
  secret: 'chat-app-secret',
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day
  resave: false,
  saveUninitialized: false
}));

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
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find user and check password directly
    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Set session after successful login
    req.session.user = { username: user.username };
    res.json({ username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
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