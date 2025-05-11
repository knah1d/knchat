// Authentication middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized: Please log in' });
};

// Debugging middleware for logging requests
const requestLogger = (req, res, next) => {
  console.log('Request Debug:', {
    url: req.url,
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
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.set({
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': req.headers.origin || req.headers.referer,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
};

export {
  isAuthenticated,
  requestLogger,
  securityHeaders
};
