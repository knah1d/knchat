const router = require('express').Router();
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// Get messages for a room
router.get('/:room', auth, async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .populate('sender', 'username')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
});

// Send a message
router.post('/', auth, async (req, res) => {
  try {
    const { content, room } = req.body;
    const message = new Message({
      content,
      room,
      sender: req.userId
    });
    await message.save();
    
    const populatedMessage = await Message.findById(message._id).populate('sender', 'username');
    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
});

module.exports = router; 