import mongoose from 'mongoose';
import { config } from '../core/config';

// Single shared connection for the whole app — never call mongoose.connect()
// anywhere else. Everything (models, repositories) uses this one connection
// via the default mongoose singleton.
export async function connectDatabase(): Promise<void> {
  if (!config.mongoUri) {
    console.error('MONGO_URI is not set — cannot connect to the database.');
    process.exit(1);
  }

  try {
    await mongoose.connect(config.mongoUri);
    console.log(`Connected to MongoDB (${mongoose.connection.name})`);
  } catch (e) {
    console.error('Failed to connect to MongoDB:', (e as Error).message);
    process.exit(1);
  }
}