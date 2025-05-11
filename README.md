# KnChat - Real-time MERN Chat Application

A full-featured real-time chat application built using the MERN stack (MongoDB, Express.js, React.js, Node.js) with Socket.IO for real-time communication. This application follows a modular architecture for better maintainability and separation of concerns.

## Features
- Real-time messaging with Socket.IO
- User authentication with session management
- Typing indicators
- Message history
- Modern Material-UI interface
- Responsive design for mobile and desktop
- Secure session handling

## Project Structure

```
knchat/
├── backend/               # Node.js and Express server
│   ├── config/            # Configuration files
│   │   ├── app.js         # App-level configuration
│   │   └── db.js          # Database configuration
│   ├── controllers/       # Request handlers
│   │   ├── authController.js
│   │   └── messageController.js
│   ├── middleware/        # Custom middleware
│   │   └── auth.js        # Authentication middleware
│   ├── models/            # MongoDB schemas
│   │   ├── Message.js
│   │   └── User.js
│   ├── routes/            # API routes
│   │   ├── auth.js
│   │   └── messages.js
│   ├── services/          # Business logic services
│   │   ├── sessionService.js
│   │   └── socketService.js
│   └── utils/             # Utility functions
│       └── logger.js
│
└── frontend/              # React client application
    ├── public/            # Static files
    └── src/
        ├── components/    # React components
        │   ├── Chat.js
        │   ├── Login.js
        │   └── Register.js
        ├── context/       # React context providers
        │   └── AuthContext.js
        ├── App.js         # Main application component
        ├── config.js      # Frontend configuration
        └── index.js       # Entry point
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Quick Start (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/knchat.git
   cd knchat
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Set up the backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env    # Create environment file from template
   ```
   
   Edit the `.env` file with your MongoDB connection string and other settings:
   ```
   MONGODB_URI=mongodb://localhost:27017/knchat
   PORT=5000
   NODE_ENV=development
   SESSION_SECRET=your-secret-key
   SESSION_CRYPTO_SECRET=your-crypto-secret
   FRONTEND_URL=http://localhost:3000
   ```

4. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   ```

5. **Start the application (from the root directory)**
   
   In one terminal window, start the backend:
   ```bash
   cd backend
   npm run dev
   ```
   
   In another terminal window, start the frontend:
   ```bash
   cd frontend
   npm start
   ```
   
6. **Access the application**
   
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Production Deployment

For production deployment, set the following environment variables:
- `NODE_ENV=production`
- Update the `MONGODB_URI` to your production database
- Set `FRONTEND_URL` to your production frontend URL

## Key Components and Responsibilities

### Backend

- **Config Layer:** Manages application configuration and environment settings
- **Controller Layer:** Handles HTTP requests and responses
- **Middleware Layer:** Provides authentication, logging, and request processing
- **Model Layer:** Defines data schemas and interfaces with MongoDB
- **Routes Layer:** Maps API endpoints to controller functions
- **Service Layer:** Implements core business logic and external integrations
- **Utilities:** Common helper functions and logging

### Frontend

- **Component Layer:** Reusable UI components
- **Context Layer:** State management across components
- **Config:** API endpoints and application settings
- **App:** Main application component with routing

## Technologies Used

### Backend
- **Node.js & Express:** Server framework
- **MongoDB & Mongoose:** Database and ORM
- **Socket.IO:** Real-time communication
- **express-session & connect-mongo:** Session management
- **cors:** Cross-Origin Resource Sharing

### Frontend
- **React:** UI library
- **React Router:** Navigation and routing
- **Material-UI:** Component library
- **Socket.IO Client:** Real-time communication
- **Axios:** HTTP client

## License

[MIT](LICENSE)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 