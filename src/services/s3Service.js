import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, AWS_CONFIG } from '../config/aws.js';
import { v4 as uuidv4 } from 'uuid';

export const S3Service = {
  async uploadImage(imageBuffer, fileName, contentType = 'image/jpeg') {
    const key = `faces/${uuidv4()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: AWS_CONFIG.s3Bucket,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    const imageUrl = `https://${AWS_CONFIG.s3Bucket}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`;

    return {
      key,
      url: imageUrl,
      bucket: AWS_CONFIG.s3Bucket,
    };
  },

  async deleteImage(key) {
    const command = new DeleteObjectCommand({
      Bucket: AWS_CONFIG.s3Bucket,
      Key: key,
    });

    await s3Client.send(command);
    return { success: true, key };
  },

  async getImage(key) {
    const command = new GetObjectCommand({
      Bucket: AWS_CONFIG.s3Bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    return response;
  },

  getImageUrl(key) {
    return `https://${AWS_CONFIG.s3Bucket}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`;
  },
};
