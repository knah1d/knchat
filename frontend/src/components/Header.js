import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, Tooltip } from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = ({ onlineCount = 0 }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
      <Toolbar>
        <Typography 
          variant="h6" 
          sx={{ 
            flexGrow: 1,
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}
        >
          KnChat
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'success.main',
                mr: 1,
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {onlineCount} Online
            </Typography>
          </Box>
          
          {user && (
            <>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary',
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                {user.username}
              </Typography>
              
              <Tooltip title="Logout">
                <IconButton 
                  color="inherit" 
                  edge="end" 
                  onClick={handleLogout}
                  sx={{ 
                    color: 'text.secondary',
                    '&:hover': { color: 'error.main' } 
                  }}
                >
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
