import Message from '../models/Message.js';

// Get recent messages
const getRecentMessages = async (req, res) => {
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
};

// Save a new message
const saveMessage = async (messageData) => {
  try {
    const message = new Message({
      content: messageData.content,
      username: messageData.username,
      timestamp: new Date()
    });
    
    await message.save();
    console.log('Message saved:', message);
    
    return message;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
};

// Get message history for new connections
const getMessageHistory = async () => {
  try {
    const messages = await Message.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    
    return messages.reverse();
  } catch (error) {
    console.error('Error fetching message history:', error);
    throw error;
  }
};

export {
  getRecentMessages,
  saveMessage,
  getMessageHistory
};
