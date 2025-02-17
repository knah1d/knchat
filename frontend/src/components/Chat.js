import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  List, 
  ListItem,  
  AppBar, 
  Toolbar,
  Avatar,
  Fade,
  IconButton,
  Alert,
  Link,
  CircularProgress
} from '@mui/material';
import { Send as SendIcon, EmojiEmotions as EmojiIcon, Logout as LogoutIcon } from '@mui/icons-material';
import io from 'socket.io-client';
import axios from 'axios';
import { API_URL, SOCKET_URL, API_CONFIG } from '../config';

// Configure axios to include credentials
axios.defaults.withCredentials = true;

const getAvatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#34495e',
    '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50',
    '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6', '#f39c12',
  ];
  return colors[Math.abs(hash) % colors.length];
};

const TypingIndicator = ({ typingUsers, currentUser }) => {
  const otherTypingUsers = typingUsers.filter(user => user !== currentUser);
  
  if (otherTypingUsers.length === 0) return null;
  
  const text = otherTypingUsers.length === 1
    ? `${otherTypingUsers[0]} is typing...`
    : `${otherTypingUsers.length} people are typing...`;

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: '80px',
        left: '24px',
        zIndex: 1,
        animation: 'fadeIn 0.3s ease-in-out',
      }}
    >
      <Paper
        elevation={2}
        sx={{
          p: 1,
          borderRadius: 2,
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              animation: 'bounce 1s infinite',
              '&:nth-of-type(2)': {
                animation: 'bounce 1s infinite 0.2s',
              },
              '&:nth-of-type(3)': {
                animation: 'bounce 1s infinite 0.4s',
              },
              '@keyframes bounce': {
                '0%, 100%': {
                  transform: 'translateY(0)',
                },
                '50%': {
                  transform: 'translateY(-5px)',
                },
              },
              '@keyframes fadeIn': {
                from: {
                  opacity: 0,
                  transform: 'translateY(10px)',
                },
                to: {
                  opacity: 1,
                  transform: 'translateY(0)',
                },
              },
            }}
          />
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {text}
        </Typography>
      </Paper>
    </Box>
  );
};

const LoginForm = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isRegistering ? '/api/register' : '/api/login';
      const response = await axios.post(`${API_URL}${endpoint}`, {
        username,
        password
      }, API_CONFIG);
      
      onLogin(response.data.username);
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || 'An error occurred');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Paper 
          elevation={6} 
          sx={{ 
            p: 4, 
            width: '100%',
            borderRadius: 3,
            background: 'linear-gradient(145deg, #1a2027 0%, #121212 100%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}
        >
          <Typography 
            component="h1" 
            variant="h4" 
            gutterBottom 
            align="center"
            sx={{ 
              fontWeight: 600,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </Typography>
          <Typography 
            variant="subtitle1" 
            align="center" 
            sx={{ mb: 4, color: 'text.secondary' }}
          >
            {isRegistering ? 'Register to start chatting' : 'Login to continue chatting'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            />
            <TextField
              fullWidth
              variant="outlined"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                py: 1.5,
                borderRadius: 2,
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
                },
                mb: 2
              }}
            >
              {isRegistering ? 'Register' : 'Login'}
            </Button>
            <Typography align="center" color="text.secondary">
              {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
              <Link
                component="button"
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                sx={{ 
                  textDecoration: 'none',
                  color: 'primary.main',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                {isRegistering ? 'Login' : 'Register'}
              </Link>
            </Typography>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const checkAuth = async () => {
    try {
      console.log('Checking authentication...');
      const response = await axios.get(`${API_URL}/api/check-auth`, {
        ...API_CONFIG,
        withCredentials: true
      });
      
      console.log('Auth check response:', response.data);
      
      if (response.data.isAuthenticated) {
        setUsername(response.data.username);
        return true;
      } else {
        console.log('Not authenticated:', response.data.reason);
        setUsername('');
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUsername('');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, []);

  // Socket connection
  useEffect(() => {
    if (!username) return;

    console.log('Initializing socket connection for user:', username);
    
    socketRef.current = io(SOCKET_URL, {
      query: { username },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected successfully');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    
    socketRef.current.on('previous-messages', (previousMessages) => {
      console.log('Received previous messages:', previousMessages.length);
      setMessages(previousMessages);
    });
    
    socketRef.current.on('message', (message) => {
      console.log('Received new message:', message);
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socketRef.current.on('typing-update', (users) => {
      setTypingUsers(users);
    });

    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return () => {
      console.log('Cleaning up socket connection');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [username]);

  // Handle login success
  const handleLoginSuccess = async (newUsername) => {
    console.log('Login success for user:', newUsername);
    setUsername(newUsername);
    await checkAuth(); // Verify authentication immediately after login
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      console.log('Logging out...');
      
      await axios.post(`${API_URL}/api/logout`, {}, {
        ...API_CONFIG,
        withCredentials: true
      });
      
      // Clean up socket connection
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      // Clear all states
      setUsername('');
      setMessages([]);
      setTypingUsers([]);
      setNewMessage('');
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      socketRef.current.emit('typing-start', username);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('typing-end', username);
      typingTimeoutRef.current = null;
    }, 1000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    console.log('Sending message:', {
      content: newMessage,
      username: username,
      timestamp: new Date().toISOString()
    });

    try {
      if (!socketRef.current?.connected) {
        console.error('Socket not connected');
        return;
      }

      const messageData = {
        content: newMessage,
        username: username,
        timestamp: new Date().toISOString()
      };

      socketRef.current.emit('message', messageData);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}
      >
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          {username ? 'Loading chat...' : 'Checking session...'}
        </Typography>
      </Box>
    );
  }

  if (!username) {
    return <LoginForm onLogin={handleLoginSuccess} />;
  }

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <AppBar 
        position="static" 
        sx={{ 
          background: 'linear-gradient(45deg, #1976D2 30%, #2196F3 90%)',
          boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)'
        }}
      >
        <Toolbar>
          <Avatar 
            sx={{ 
              bgcolor: getAvatarColor(username),
              mr: 2
            }}
          >
            {username.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            KNchat
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 500, mr: 2 }}>
            {username}
          </Typography>
          <IconButton 
            color="inherit" 
            onClick={handleLogout}
            sx={{
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        py: 3,
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          position: 'relative', 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <Paper 
            elevation={6} 
            sx={{ 
              flex: 1, 
              mb: 2, 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 180px)',
              borderRadius: 3,
              bgcolor: 'background.paper',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#1a2027',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#2f3c47',
                borderRadius: '4px',
                '&:hover': {
                  background: '#3f4c57',
                },
              },
            }}
          >
            <List sx={{ 
              p: 2,
              overflow: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column'
            }}>
              {messages.map((message, index) => (
                <Fade in={true} key={index}>
                  <ListItem
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: message.username === username ? 'flex-end' : 'flex-start',
                      p: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                        maxWidth: '70%',
                      }}
                    >
                      {message.username !== username && (
                        <Avatar 
                          sx={{ 
                            bgcolor: getAvatarColor(message.username),
                            width: 32,
                            height: 32,
                          }}
                        >
                          {message.username.charAt(0).toUpperCase()}
                        </Avatar>
                      )}
                      <Box>
                        {message.username !== username && (
                          <Typography
                            variant="caption"
                            sx={{ ml: 1, color: 'text.secondary' }}
                          >
                            {message.username}
                          </Typography>
                        )}
                        <Paper
                          elevation={1}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: message.username === username ? 'primary.dark' : '#2f3c47',
                            color: 'text.primary',
                            ml: message.username === username ? 2 : 0,
                          }}
                        >
                          <Typography variant="body1">
                            {message.content}
                          </Typography>
                        </Paper>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 0.5,
                            ml: 1,
                            color: 'text.secondary',
                          }}
                        >
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    </Box>
                  </ListItem>
                </Fade>
              ))}
              <div ref={messagesEndRef} />
            </List>
          </Paper>

          <TypingIndicator typingUsers={typingUsers} currentUser={username} />

          <Paper
            component="form"
            onSubmit={handleSendMessage}
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 3,
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              bgcolor: 'background.paper',
            }}
          >
            <IconButton color="primary" sx={{ p: 1 }}>
              <EmojiIcon />
            </IconButton>
            <TextField
              fullWidth
              variant="standard"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              InputProps={{
                disableUnderline: true,
              }}
              sx={{ 
                '& .MuiInputBase-root': {
                  padding: 1,
                  color: 'text.primary',
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'text.secondary',
                  opacity: 0.7,
                },
              }}
            />
            <IconButton 
              type="submit"
              color="primary"
              disabled={!newMessage.trim()}
              sx={{
                p: 1,
                bgcolor: newMessage.trim() ? 'primary.main' : 'action.disabled',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <SendIcon />
            </IconButton>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default Chat; 