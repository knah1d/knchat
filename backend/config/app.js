// Get allowed origins based on environment
const getOrigins = () => {
  const origins = [
    'http://localhost:3000',
    'https://localhost:3000',
    'https://knchat.netlify.app',
    'https://knchat.onrender.com'
  ].filter(Boolean);

  return origins;
};

// Session configuration based on environment
const getSessionConfig = (sessionStore) => {
  return {
    secret: process.env.SESSION_SECRET || 'chat-app-secret',
    name: 'connect.sid',
    store: sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    },
    rolling: true,
    resave: false,
    saveUninitialized: false,
    proxy: true
  };
};

// CORS configuration
const corsOptions = (allowedOrigins) => ({
  origin: function(origin, callback) {
    console.log('CORS Request Origin:', origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error('CORS Error - Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['set-cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
});

// Socket.IO CORS options
const socketCorsOptions = (allowedOrigins) => ({
  cors: {
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  }
});

export {
  getOrigins,
  getSessionConfig,
  corsOptions,
  socketCorsOptions
};
