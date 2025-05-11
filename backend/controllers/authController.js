import User from '../models/User.js';

// Register a new user
const registerUser = async (req, res) => {
  try {
    console.log('Register attempt:', {
      body: req.body,
      sessionID: req.sessionID,
      hasSession: !!req.session
    });

    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create new user
    const user = new User({ username, password });
    await user.save();

    // Set session data
    req.session.user = { 
      username: user.username,
      id: user._id 
    };

    // Save session explicitly
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          reject(err);
        } else {
          console.log('Session saved successfully:', {
            sessionID: req.sessionID,
            user: req.session.user
          });
          resolve();
        }
      });
    });

    res.status(201).json({ 
      username: user.username,
      sessionID: req.sessionID
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    console.log('Login attempt:', {
      body: req.body,
      sessionID: req.sessionID,
      hasSession: !!req.session,
      headers: {
        origin: req.get('origin'),
        referer: req.get('referer'),
        cookie: req.get('cookie')
      }
    });
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Set session data
    req.session.user = { 
      username: user.username,
      id: user._id 
    };

    // Save session explicitly
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          reject(err);
        } else {
          console.log('Session saved successfully:', {
            sessionID: req.sessionID,
            user: req.session.user,
            cookies: req.cookies
          });
          resolve();
        }
      });
    });

    res.json({ 
      username: user.username,
      sessionID: req.sessionID
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Logout user
const logoutUser = (req, res) => {
  const sessionID = req.sessionID;
  
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
};

// Check if user is authenticated
const checkAuth = (req, res) => {
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
};

export {
  registerUser,
  loginUser,
  logoutUser,
  checkAuth
};
