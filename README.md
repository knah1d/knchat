# MERN Chat Application

A simple real-time chat application built using the MERN stack (MongoDB, Express.js, React.js, Node.js) with Socket.IO for real-time communication.

## Features
- Real-time messaging
- Simple user authentication
- Clean and intuitive UI

## Project Structure
```
mern-chat/
  ├── backend/         # Node.js and Express server
  └── frontend/        # React client application
```

## Setup Instructions

### Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your MongoDB connection string:
   ```
   MONGODB_URI=your_mongodb_uri
   PORT=5000
   ```
4. Start the server:
   ```bash
   npm start
   ```

### Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

## Technologies Used
- MongoDB
- Express.js
- React.js
- Node.js
- Socket.IO
- Material-UI 