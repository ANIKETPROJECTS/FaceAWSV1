import { MongoClient } from 'mongodb';

let db = null;
let client = null;

export async function connectDatabase() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    client = new MongoClient(uri);
    await client.connect();
    
    db = client.db('faceRecognition');
    
    await db.collection('users').createIndex({ faceId: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ name: 1 });
    await db.collection('users').createIndex({ createdAt: -1 });
    
    console.log('Connected to MongoDB successfully');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return db;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}
