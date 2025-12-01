import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase } from './config/database.js';
import faceRoutes from './routes/faceRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    message: 'Face Recognition API Server',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/face/health',
      register: 'POST /api/face/register',
      authenticate: 'POST /api/face/authenticate',
      verify: 'POST /api/face/verify/:userId',
      getUsers: 'GET /api/face/users',
      getUser: 'GET /api/face/users/:userId',
      deleteUser: 'DELETE /api/face/users/:userId',
    },
    documentation: '/api/docs',
  });
});

app.use('/api/face', faceRoutes);

app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Face Recognition API Documentation',
    version: '1.0.0',
    baseUrl: '/api/face',
    endpoints: [
      {
        method: 'POST',
        path: '/register',
        description: 'Register a new face with user name',
        contentType: 'multipart/form-data',
        parameters: {
          name: { type: 'string', required: true, description: 'User name' },
          image: { type: 'file', required: true, description: 'Face image (JPEG, PNG, WebP)' },
        },
        responses: {
          201: { description: 'Face registered successfully' },
          400: { description: 'Invalid input or no face detected' },
          409: { description: 'Face already registered' },
        },
      },
      {
        method: 'POST',
        path: '/authenticate',
        description: 'Authenticate a face against all registered faces',
        contentType: 'multipart/form-data',
        parameters: {
          image: { type: 'file', required: true, description: 'Face image to authenticate' },
          threshold: { type: 'number', required: false, description: 'Similarity threshold (default: 80)' },
        },
        responses: {
          200: { description: 'Authentication successful' },
          400: { description: 'No face detected' },
          401: { description: 'Face not recognized' },
        },
      },
      {
        method: 'POST',
        path: '/verify/:userId',
        description: 'Verify if a face matches a specific registered user',
        contentType: 'multipart/form-data',
        parameters: {
          userId: { type: 'string', required: true, in: 'path', description: 'User ID to verify against' },
          image: { type: 'file', required: true, description: 'Face image to verify' },
          threshold: { type: 'number', required: false, description: 'Similarity threshold (default: 80)' },
        },
        responses: {
          200: { description: 'Face verified successfully' },
          400: { description: 'No face detected' },
          401: { description: 'Face does not match' },
          404: { description: 'User not found' },
        },
      },
      {
        method: 'GET',
        path: '/users',
        description: 'Get all registered users',
        parameters: {
          limit: { type: 'number', required: false, in: 'query', description: 'Max results (default: 100)' },
          skip: { type: 'number', required: false, in: 'query', description: 'Offset for pagination' },
        },
        responses: {
          200: { description: 'List of users with pagination' },
        },
      },
      {
        method: 'GET',
        path: '/users/:userId',
        description: 'Get a specific user by ID',
        responses: {
          200: { description: 'User details' },
          404: { description: 'User not found' },
        },
      },
      {
        method: 'DELETE',
        path: '/users/:userId',
        description: 'Delete a user and their face data',
        responses: {
          200: { description: 'User deleted successfully' },
          404: { description: 'User not found' },
        },
      },
    ],
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

async function startServer() {
  try {
    await connectDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Face Recognition API Server running on port ${PORT}`);
      console.log(`API Documentation available at http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
