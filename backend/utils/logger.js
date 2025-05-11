// Log environment variables for debugging
const logEnvironment = () => {
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not Set',
    FRONTEND_URL: process.env.FRONTEND_URL,
  });
};

// Format date for logging
const formatDate = (date) => {
  return new Date(date).toISOString();
};

// Create standardized response object
const createResponse = (success, message, data = null) => {
  return {
    success,
    message,
    timestamp: formatDate(new Date()),
    data
  };
};

export {
  logEnvironment,
  formatDate,
  createResponse
};
