import { S3Client } from '@aws-sdk/client-s3';
import { RekognitionClient } from '@aws-sdk/client-rekognition';

const awsConfig = {
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

export const s3Client = new S3Client(awsConfig);
export const rekognitionClient = new RekognitionClient(awsConfig);

export const AWS_CONFIG = {
  s3Bucket: process.env.AWS_S3_BUCKET,
  rekognitionCollectionId: process.env.REKOGNITION_COLLECTION_ID || 'face-auth-collection',
  region: process.env.AWS_REGION || 'ap-south-1',
};
