import express from 'express';
import { upload, handleMulterError } from '../middleware/upload.js';
import { S3Service } from '../services/s3Service.js';
import { RekognitionService } from '../services/rekognitionService.js';
import { UserModel } from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.post('/register', upload.single('image'), handleMulterError, async (req, res) => {
  try {
    const { name } = req.body;
    const imageFile = req.file;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        error: 'Face image is required',
      });
    }

    const faces = await RekognitionService.detectFaces(imageFile.buffer);
    
    if (faces.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No face detected in the image. Please provide a clear face image.',
      });
    }

    if (faces.length > 1) {
      return res.status(400).json({
        success: false,
        error: 'Multiple faces detected. Please provide an image with only one face.',
      });
    }

    const existingSearch = await RekognitionService.searchFacesByImage(imageFile.buffer, 1, 95);
    
    if (existingSearch.faceMatches && existingSearch.faceMatches.length > 0) {
      const matchedFaceId = existingSearch.faceMatches[0].Face.ExternalImageId;
      const existingUser = await UserModel.findByFaceId(matchedFaceId);
      
      return res.status(409).json({
        success: false,
        error: 'This face is already registered',
        existingUser: existingUser ? { id: existingUser._id, name: existingUser.name } : null,
      });
    }

    const faceId = uuidv4();
    const fileName = `${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
    
    const s3Result = await S3Service.uploadImage(imageFile.buffer, fileName, imageFile.mimetype);

    let rekognitionResult;
    try {
      rekognitionResult = await RekognitionService.indexFace(s3Result.key, faceId);
    } catch (indexError) {
      await S3Service.deleteImage(s3Result.key);
      throw indexError;
    }

    const user = await UserModel.create({
      name: name.trim(),
      faceId: faceId,
      s3ImageKey: s3Result.key,
      s3ImageUrl: s3Result.url,
      rekognitionFaceId: rekognitionResult.faceId,
      boundingBox: rekognitionResult.boundingBox,
      confidence: rekognitionResult.confidence,
    });

    res.status(201).json({
      success: true,
      message: 'Face registered successfully',
      data: {
        userId: user._id,
        name: user.name,
        faceId: user.faceId,
        imageUrl: user.s3ImageUrl,
        confidence: user.confidence,
        createdAt: user.createdAt,
      },
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register face',
      details: error.message,
    });
  }
});

router.post('/authenticate', upload.single('image'), handleMulterError, async (req, res) => {
  try {
    const imageFile = req.file;
    const threshold = parseFloat(req.body.threshold) || 80;

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        error: 'Face image is required',
      });
    }

    const searchResult = await RekognitionService.searchFacesByImage(imageFile.buffer, 1, threshold);

    if (searchResult.error) {
      return res.status(400).json({
        success: false,
        error: searchResult.error,
        authenticated: false,
      });
    }

    if (!searchResult.faceMatches || searchResult.faceMatches.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Face not recognized. User not registered.',
        authenticated: false,
      });
    }

    const matchedFace = searchResult.faceMatches[0];
    const user = await UserModel.findByFaceId(matchedFace.Face.ExternalImageId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User record not found',
        authenticated: false,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      authenticated: true,
      data: {
        userId: user._id,
        name: user.name,
        similarity: matchedFace.Similarity,
        confidence: matchedFace.Face.Confidence,
        imageUrl: user.s3ImageUrl,
      },
    });

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      authenticated: false,
      details: error.message,
    });
  }
});

router.post('/verify/:userId', upload.single('image'), handleMulterError, async (req, res) => {
  try {
    const { userId } = req.params;
    const imageFile = req.file;
    const threshold = parseFloat(req.body.threshold) || 80;

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        error: 'Face image is required',
      });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        verified: false,
      });
    }

    const searchResult = await RekognitionService.searchFacesByImage(imageFile.buffer, 5, threshold);

    if (searchResult.error) {
      return res.status(400).json({
        success: false,
        error: searchResult.error,
        verified: false,
      });
    }

    const matchingFace = searchResult.faceMatches?.find(
      match => match.Face.ExternalImageId === user.faceId
    );

    if (!matchingFace) {
      return res.status(401).json({
        success: false,
        error: 'Face does not match the registered user',
        verified: false,
        userId: user._id,
        userName: user.name,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Face verified successfully',
      verified: true,
      data: {
        userId: user._id,
        name: user.name,
        similarity: matchingFace.Similarity,
        confidence: matchingFace.Face.Confidence,
      },
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      verified: false,
      details: error.message,
    });
  }
});

router.get('/users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const skip = parseInt(req.query.skip) || 0;

    const users = await UserModel.findAll({ limit, skip });
    const totalCount = await UserModel.count();

    res.status(200).json({
      success: true,
      data: {
        users: users.map(user => ({
          userId: user._id,
          name: user.name,
          imageUrl: user.s3ImageUrl,
          createdAt: user.createdAt,
        })),
        pagination: {
          total: totalCount,
          limit,
          skip,
          hasMore: skip + users.length < totalCount,
        },
      },
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users',
      details: error.message,
    });
  }
});

router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        name: user.name,
        imageUrl: user.s3ImageUrl,
        confidence: user.confidence,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user',
      details: error.message,
    });
  }
});

router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (user.rekognitionFaceId) {
      await RekognitionService.deleteFace(user.rekognitionFaceId);
    }

    if (user.s3ImageKey) {
      await S3Service.deleteImage(user.s3ImageKey);
    }

    await UserModel.deleteById(userId);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: {
        userId: user._id,
        name: user.name,
      },
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      details: error.message,
    });
  }
});

router.get('/health', async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Face Recognition API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
