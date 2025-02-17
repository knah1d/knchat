const router = require('express').Router();
const User = require('../models/User');

// Debug middleware for auth routes
router.use((req, res, next) => {
  console.log('Auth Route Debug:', {
    path: req.path,
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

// Check authentication status
router.get('/check-auth', (req, res) => {
  console.log('Check Auth Debug:', {
    sessionID: req.sessionID,
    session: req.session,
    user: req.session?.user,
    cookies: req.cookies,
    headers: {
      origin: req.get('origin'),
      referer: req.get('referer'),
      cookie: req.get('cookie')
    }
  });

  // Set proper CORS headers
  res.set({
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': req.headers.origin || req.headers.referer
  });

  if (req.session && req.session.user) {
    res.json({ 
      isAuthenticated: true, 
      username: req.session.user.username,
      sessionID: req.sessionID
    });
  } else {
    res.json({ 
      isAuthenticated: false,
      reason: !req.session ? 'No session' : 'No user in session',
      sessionID: req.sessionID
    });
  }
});

// Register
// router.post('/register', async (req, res) => {
//   try {
//     console.log('Register attempt:', {
//       body: req.body,
//       sessionID: req.sessionID,
//       hasSession: !!req.session
//     });

//     const { username, password } = req.body;
    
//     if (!username || !password) {
//       return res.status(400).json({ message: 'Username and password are required' });
//     }

//     // Check if user exists
//     const existingUser = await User.findOne({ username });
//     if (existingUser) {
//       return res.status(400).json({ message: 'Username already exists' });
//     }

//     // Create new user
//     const user = new User({ username, password });
//     await user.save();

//     // Set proper CORS headers
//     res.set({
//       'Access-Control-Allow-Credentials': 'true',
//       'Access-Control-Allow-Origin': req.headers.origin || req.headers.referer
//     });

//     // Set session data
//     req.session.user = { 
//       username: user.username,
//       id: user._id 
//     };

//     // Save session explicitly
//     await new Promise((resolve, reject) => {
//       req.session.save((err) => {
//         if (err) {
//           console.error('Session save error:', err);
//           reject(err);
//         } else {
//           console.log('Session saved successfully:', {
//             sessionID: req.sessionID,
//             user: req.session.user
//           });
//           resolve();
//         }
//       });
//     });

//     res.status(201).json({ 
//       username: user.username,
//       sessionID: req.sessionID
//     });
//   } catch (error) {
//     console.error('Registration error:', error);
//     res.status(500).json({ message: 'Error creating user' });
//   }
// });

// // Login
// router.post('/login', async (req, res) => {
//   try {
//     console.log('Login attempt:', {
//       body: req.body,
//       sessionID: req.sessionID,
//       hasSession: !!req.session,
//       headers: {
//         origin: req.get('origin'),
//         referer: req.get('referer'),
//         cookie: req.get('cookie')
//       }
//     });
    
//     const { username, password } = req.body;
    
//     if (!username || !password) {
//       return res.status(400).json({ message: 'Username and password are required' });
//     }

//     const user = await User.findOne({ username, password });
//     if (!user) {
//       return res.status(400).json({ message: 'Invalid username or password' });
//     }

//     // Set proper CORS headers
//     res.set({
//       'Access-Control-Allow-Credentials': 'true',
//       'Access-Control-Allow-Origin': req.headers.origin || req.headers.referer
//     });

//     // Set session data
//     req.session.user = { 
//       username: user.username,
//       id: user._id 
//     };

//     // Save session explicitly
//     await new Promise((resolve, reject) => {
//       req.session.save((err) => {
//         if (err) {
//           console.error('Session save error:', err);
//           reject(err);
//         } else {
//           console.log('Session saved successfully:', {
//             sessionID: req.sessionID,
//             user: req.session.user,
//             cookies: req.cookies
//           });
//           resolve();
//         }
//       });
//     });

//     res.json({ 
//       username: user.username,
//       sessionID: req.sessionID
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ message: 'Error logging in', error: error.message });
//   }
// });

// Logout
router.post('/logout', (req, res) => {
  const sessionID = req.sessionID;
  
  // Set proper CORS headers
  res.set({
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': req.headers.origin || req.headers.referer
  });
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Error logging out' });
    }
    
    // Clear all session-related cookies
    res.clearCookie('sessionId');
    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    
    console.log('Logout successful:', {
      clearedSession: sessionID
    });
    
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router; 