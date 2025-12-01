# Face Recognition API Backend

## Overview

A complete backend API system for an Android face recognition app using AWS Rekognition, AWS S3, and MongoDB. The system provides face registration, authentication, and verification capabilities with a built-in web-based testing interface.

## Project Structure

```
├── public/
│   └── index.html          # Frontend testing UI
├── src/
│   ├── config/
│   │   ├── aws.js          # AWS SDK configuration (S3, Rekognition)
│   │   └── database.js     # MongoDB connection setup
│   ├── middleware/
│   │   └── upload.js       # Multer file upload middleware
│   ├── models/
│   │   └── User.js         # MongoDB user model
│   ├── routes/
│   │   └── faceRoutes.js   # API route handlers
│   ├── services/
│   │   ├── rekognitionService.js  # AWS Rekognition operations
│   │   └── s3Service.js    # AWS S3 operations
│   └── server.js           # Express server entry point
├── API_DOCUMENTATION.md    # Complete API documentation
├── package.json            # Node.js dependencies
└── .gitignore
```

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **Cloud Services**: 
  - AWS S3 (image storage)
  - AWS Rekognition (face detection, indexing, matching)
- **Dependencies**:
  - @aws-sdk/client-s3 - AWS S3 SDK
  - @aws-sdk/client-rekognition - AWS Rekognition SDK
  - mongodb - MongoDB driver
  - multer - File upload handling
  - uuid - Unique ID generation
  - cors - Cross-origin support
  - dotenv - Environment configuration

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info and available endpoints |
| GET | `/api/face/health` | Health check |
| POST | `/api/face/register` | Register a new face |
| POST | `/api/face/authenticate` | Authenticate a face |
| POST | `/api/face/verify/:userId` | Verify face against specific user |
| GET | `/api/face/users` | Get all registered users |
| GET | `/api/face/users/:userId` | Get user by ID |
| DELETE | `/api/face/users/:userId` | Delete user and face data |
| GET | `/api/docs` | Interactive API documentation |

## Running the Server

The server runs on port 5000 and binds to 0.0.0.0 for external access.

## Environment Variables

Required environment variables are configured in Replit secrets:
- MONGODB_URI
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION
- AWS_S3_BUCKET
- REKOGNITION_COLLECTION_ID
- PORT

## How It Works

### Face Registration
1. Upload image with user name
2. Detect faces using Rekognition
3. Check for duplicate faces
4. Store image in S3
5. Index face in Rekognition collection
6. Save metadata in MongoDB

### Face Authentication
1. Upload image to authenticate
2. Search faces in Rekognition collection
3. Return matched user if similarity exceeds threshold

### Face Verification
1. Upload image with target user ID
2. Search faces in Rekognition
3. Check if matched face belongs to specified user

## Recent Changes

- Initial project setup (Nov 2025)
- Complete backend API implementation
- AWS Rekognition and S3 integration
- MongoDB database models
- Comprehensive API documentation
- Fixed real-time authentication canvas element errors (Nov 30 2025)
- Created detailed Android API documentation with Java/Groovy examples (Nov 30 2025)
