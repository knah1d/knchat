import { Server } from 'socket.io';
import { socketCorsOptions } from '../config/app.js';
import { saveMessage, getMessageHistory } from '../controllers/messageController.js';

// Setup Socket.IO service
const setupSocketIO = (server, allowedOrigins) => {
  // Initialize Socket.IO with CORS settings
  const io = new Server(server, socketCorsOptions(allowedOrigins));
  
  // Store typing users
  let typingUsers = new Set();
  
  // Socket.IO connection handling
  io.on('connection', async (socket) => {
    const username = socket.handshake.query.username;
    console.log('New client connected:', username);
  
    try {
      // Send existing messages to newly connected client
      const messages = await getMessageHistory();
      socket.emit('previous-messages', messages);
    } catch (error) {
      console.error('Error fetching messages for new connection:', error);
    }
  
    // Handle new messages
    socket.on('message', async (messageData) => {
      try {
        console.log('New message received:', messageData);
        
        const message = await saveMessage(messageData);
        
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
        console.error('Error processing message:', error);
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
  
  return io;
};

export { setupSocketIO };
