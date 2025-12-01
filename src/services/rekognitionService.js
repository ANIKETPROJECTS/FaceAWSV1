import {
  CreateCollectionCommand,
  DeleteCollectionCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  DeleteFacesCommand,
  ListCollectionsCommand,
  CompareFacesCommand,
  DetectFacesCommand,
} from '@aws-sdk/client-rekognition';
import { rekognitionClient, AWS_CONFIG } from '../config/aws.js';

export const RekognitionService = {
  async ensureCollectionExists() {
    try {
      const listCommand = new ListCollectionsCommand({});
      const response = await rekognitionClient.send(listCommand);
      
      const collectionExists = response.CollectionIds?.includes(AWS_CONFIG.rekognitionCollectionId);
      
      if (!collectionExists) {
        const createCommand = new CreateCollectionCommand({
          CollectionId: AWS_CONFIG.rekognitionCollectionId,
        });
        await rekognitionClient.send(createCommand);
        console.log(`Created Rekognition collection: ${AWS_CONFIG.rekognitionCollectionId}`);
      }
      
      return { success: true, collectionId: AWS_CONFIG.rekognitionCollectionId };
    } catch (error) {
      console.error('Error ensuring collection exists:', error);
      throw error;
    }
  },

  async detectFaces(imageBuffer) {
    const command = new DetectFacesCommand({
      Image: {
        Bytes: imageBuffer,
      },
      Attributes: ['ALL'],
    });

    const response = await rekognitionClient.send(command);
    return response.FaceDetails || [];
  },

  async indexFace(s3Key, externalImageId) {
    await this.ensureCollectionExists();

    const command = new IndexFacesCommand({
      CollectionId: AWS_CONFIG.rekognitionCollectionId,
      Image: {
        S3Object: {
          Bucket: AWS_CONFIG.s3Bucket,
          Name: s3Key,
        },
      },
      ExternalImageId: externalImageId,
      MaxFaces: 1,
      QualityFilter: 'AUTO',
      DetectionAttributes: ['ALL'],
    });

    const response = await rekognitionClient.send(command);

    if (!response.FaceRecords || response.FaceRecords.length === 0) {
      if (response.UnindexedFaces && response.UnindexedFaces.length > 0) {
        const reason = response.UnindexedFaces[0].Reasons?.join(', ') || 'Unknown reason';
        throw new Error(`Face could not be indexed: ${reason}`);
      }
      throw new Error('No face detected in the image');
    }

    const faceRecord = response.FaceRecords[0];
    return {
      faceId: faceRecord.Face.FaceId,
      boundingBox: faceRecord.Face.BoundingBox,
      confidence: faceRecord.Face.Confidence,
      imageId: faceRecord.Face.ImageId,
      externalImageId: faceRecord.Face.ExternalImageId,
    };
  },

  async searchFacesByImage(imageBuffer, maxFaces = 1, faceMatchThreshold = 80) {
    await this.ensureCollectionExists();

    const command = new SearchFacesByImageCommand({
      CollectionId: AWS_CONFIG.rekognitionCollectionId,
      Image: {
        Bytes: imageBuffer,
      },
      MaxFaces: maxFaces,
      FaceMatchThreshold: faceMatchThreshold,
    });

    try {
      const response = await rekognitionClient.send(command);
      return {
        searchedFaceBoundingBox: response.SearchedFaceBoundingBox,
        searchedFaceConfidence: response.SearchedFaceConfidence,
        faceMatches: response.FaceMatches || [],
      };
    } catch (error) {
      if (error.name === 'InvalidParameterException' && error.message.includes('no faces')) {
        return {
          searchedFaceBoundingBox: null,
          searchedFaceConfidence: null,
          faceMatches: [],
          error: 'No face detected in the provided image',
        };
      }
      throw error;
    }
  },

  async compareFaces(sourceImageBuffer, targetImageBuffer, similarityThreshold = 80) {
    const command = new CompareFacesCommand({
      SourceImage: {
        Bytes: sourceImageBuffer,
      },
      TargetImage: {
        Bytes: targetImageBuffer,
      },
      SimilarityThreshold: similarityThreshold,
    });

    const response = await rekognitionClient.send(command);
    return {
      sourceImageFace: response.SourceImageFace,
      faceMatches: response.FaceMatches || [],
      unmatchedFaces: response.UnmatchedFaces || [],
    };
  },

  async deleteFace(faceId) {
    const command = new DeleteFacesCommand({
      CollectionId: AWS_CONFIG.rekognitionCollectionId,
      FaceIds: [faceId],
    });

    const response = await rekognitionClient.send(command);
    return {
      deletedFaces: response.DeletedFaces || [],
    };
  },

  async deleteCollection() {
    const command = new DeleteCollectionCommand({
      CollectionId: AWS_CONFIG.rekognitionCollectionId,
    });

    await rekognitionClient.send(command);
    return { success: true, collectionId: AWS_CONFIG.rekognitionCollectionId };
  },
};
