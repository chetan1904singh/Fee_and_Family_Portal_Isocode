import 'dotenv/config';
import mongoose from 'mongoose';
import { app, runReminders } from './app.js';
import { seedDatabaseIfEmpty } from './seedDatabase.js';

const port = Number(process.env.PORT ?? 4000);
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) throw new Error('MONGODB_URI is required. Copy .env.example to .env and configure MongoDB.');
if (process.env.NODE_ENV === 'production' && !process.env.SEED_ACCOUNT_PASSWORD) {
  throw new Error('SEED_ACCOUNT_PASSWORD is required in production.');
}

try {
  await mongoose.connect(mongoUri);
  await seedDatabaseIfEmpty();
  await runReminders();
  setInterval(() => {
    runReminders().catch((error) => console.error('Scheduled reminders failed:', error.message));
  }, 24 * 60 * 60 * 1000);
  app.listen(port, () => console.log(`Saarthi API listening on http://localhost:${port}`));
} catch (error) {
  console.error('Saarthi could not start:', error.message);
  process.exitCode = 1;
}
