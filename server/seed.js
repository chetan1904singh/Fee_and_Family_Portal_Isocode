import 'dotenv/config';
import mongoose from 'mongoose';
import { seedDatabaseIfEmpty } from './seedDatabase.js';

try {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(uri);
  await seedDatabaseIfEmpty();
  await mongoose.disconnect();
} catch (error) {
  console.error('Could not seed MongoDB:', error.message);
  process.exitCode = 1;
}
