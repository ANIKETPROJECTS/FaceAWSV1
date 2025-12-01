import { getDatabase } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const COLLECTION_NAME = 'users';

export const UserModel = {
  async create(userData) {
    const db = getDatabase();
    const user = {
      _id: uuidv4(),
      name: userData.name,
      faceId: userData.faceId,
      s3ImageKey: userData.s3ImageKey,
      s3ImageUrl: userData.s3ImageUrl,
      rekognitionFaceId: userData.rekognitionFaceId,
      boundingBox: userData.boundingBox || null,
      confidence: userData.confidence || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTION_NAME).insertOne(user);
    return { ...user, insertedId: result.insertedId };
  },

  async findById(id) {
    const db = getDatabase();
    return await db.collection(COLLECTION_NAME).findOne({ _id: id });
  },

  async findByFaceId(faceId) {
    const db = getDatabase();
    return await db.collection(COLLECTION_NAME).findOne({ faceId: faceId });
  },

  async findByRekognitionFaceId(rekognitionFaceId) {
    const db = getDatabase();
    return await db.collection(COLLECTION_NAME).findOne({ rekognitionFaceId: rekognitionFaceId });
  },

  async findByName(name) {
    const db = getDatabase();
    return await db.collection(COLLECTION_NAME).findOne({ name: name });
  },

  async findAll(options = {}) {
    const db = getDatabase();
    const { limit = 100, skip = 0, sort = { createdAt: -1 } } = options;
    
    return await db.collection(COLLECTION_NAME)
      .find({})
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
  },

  async count() {
    const db = getDatabase();
    return await db.collection(COLLECTION_NAME).countDocuments();
  },

  async deleteById(id) {
    const db = getDatabase();
    return await db.collection(COLLECTION_NAME).deleteOne({ _id: id });
  },

  async deleteByRekognitionFaceId(rekognitionFaceId) {
    const db = getDatabase();
    return await db.collection(COLLECTION_NAME).deleteOne({ rekognitionFaceId: rekognitionFaceId });
  },

  async update(id, updateData) {
    const db = getDatabase();
    updateData.updatedAt = new Date();
    return await db.collection(COLLECTION_NAME).updateOne(
      { _id: id },
      { $set: updateData }
    );
  },
};
