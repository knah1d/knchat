# KnChat Architecture Documentation

## Overview

KnChat is a real-time chat application built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.IO. This document outlines the architecture and key components of the application.

## System Architecture

```
+------------------+          +-------------------+         +-----------------+
|                  |  REST    |                   | MongoDB |                 |
|   React Frontend | <------> | Express Backend   | <-----> | MongoDB Database|
|   (Browser)      |  Socket  |   (Node.js)       |         |                 |
|                  | <------> |                   |         |                 |
+------------------+          +-------------------+         +-----------------+
```

### Key Components

1. **Frontend (React.js)**
   - User Interface Components
   - State Management
   - Socket.IO Client
   - API Services

2. **Backend (Express.js + Node.js)**
   - RESTful API
   - Authentication System
   - Socket.IO Server
   - MongoDB Connection

3. **Database (MongoDB)**
   - User Collection
   - Message Collection

## Backend Architecture

The backend follows a modular architecture with separation of concerns:

### 1. Server Entry Point (`server.js`)
- Express application setup
- HTTP server creation
- Middleware configuration
- Socket.IO setup
- Route registration

### 2. Configuration Layer (`/config`)
- Database configuration (`db.js`)
- App configuration (`app.js`)

### 3. Controller Layer (`/controllers`)
- Authentication controllers (`authController.js`)
- Message controllers (`messageController.js`)

### 4. Middleware Layer (`/middleware`)
- Authentication middleware (`auth.js`)
- Request logging 
- Security headers

### 5. Models Layer (`/models`)
- User model (`User.js`)
- Message model (`Message.js`)

### 6. Routes Layer (`/routes`)
- Authentication routes (`auth.js`)
- Message routes (`messages.js`)

### 7. Services Layer (`/services`)
- Socket service (`socketService.js`)
- Session service (`sessionService.js`)

### 8. Utils Layer (`/utils`)
- Logging utilities (`logger.js`)

## Frontend Architecture

The frontend uses a component-based architecture with separation of concerns:

### 1. Components (`/components`)
- Core UI building blocks
- Presentational components
- Container components

### 2. Context (`/context`)
- Authentication context (`AuthContext.js`)

### 3. Services (`/services`)
- API services (`api.js`)

### 4. Hooks (`/hooks`)
- Custom React hooks (`useSocket.js`)

### 5. Configuration (`config.js`)
- API endpoints
- Socket configuration

## Authentication Flow

1. User registers/logs in through the frontend
2. Backend validates credentials and creates a session
3. Session details are stored in MongoDB and a cookie is set
4. Frontend receives authentication confirmation
5. Protected routes check authentication status

## Messaging Flow

1. User writes a message in the chat interface
2. Socket.IO client emits a message event to the server
3. Backend receives the message, saves it to MongoDB
4. Socket.IO server broadcasts the message to all connected clients
5. All clients receive the message and update their UI

## Typing Indicator Flow

1. User starts typing in the input field
2. Frontend emits a typing-start event to the server
3. Server tracks typing users and broadcasts updates
4. Other clients receive typing updates and display indicators
5. When typing stops, a typing-end event is emitted

## Deployment Architecture

The application is designed for deployment on modern cloud platforms:

- **Frontend**: Static hosting on Netlify or similar platforms
- **Backend**: Container-based deployment on Render, Heroku, or similar services
- **Database**: MongoDB Atlas cloud database

## Security Considerations

- Session-based authentication with HTTP-only cookies
- CORS configuration to restrict access
- Security headers for protection against common web vulnerabilities
- Environment-specific settings for development/production

## Performance Considerations

- Socket connection pooling
- Message pagination
- Optimistic UI updates
- MongoDB indexing for faster queries
