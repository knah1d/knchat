import React from 'react';
import { Box, Typography, Avatar, Paper } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';

// Helper function to generate consistent avatar colors based on username
const getAvatarColor = (username) => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#34495e',
    '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50',
    '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6', '#f39c12',
  ];
  return colors[Math.abs(hash) % colors.length];
};

// Function to get initials from a username
const getInitials = (username) => {
  return username
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

/**
 * Message component to display a single chat message
 */
const Message = ({ message, isCurrentUser }) => {
  const { content, username, timestamp } = message;
  const avatarColor = getAvatarColor(username);
  const initials = getInitials(username);
  const messageTime = formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isCurrentUser ? 'row-reverse' : 'row',
        mb: 2,
        alignItems: 'flex-end',
      }}
    >
      <Avatar
        sx={{
          bgcolor: avatarColor,
          width: 36,
          height: 36,
          fontSize: '0.875rem',
          mx: 1,
        }}
      >
        {initials}
      </Avatar>
      
      <Box sx={{ maxWidth: '70%' }}>
        {!isCurrentUser && (
          <Typography
            variant="caption"
            sx={{
              ml: 1,
              mb: 0.5,
              display: 'block',
              fontWeight: 500,
              color: 'text.secondary',
            }}
          >
            {username}
          </Typography>
        )}
        
        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: isCurrentUser ? 'primary.dark' : 'background.paper',
            position: 'relative',
          }}
        >
          <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
            {content}
          </Typography>
          
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 0.5,
              textAlign: 'right',
              color: isCurrentUser ? 'rgba(255,255,255,0.7)' : 'text.secondary',
              fontSize: '0.7rem',
            }}
          >
            {messageTime}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default Message;
