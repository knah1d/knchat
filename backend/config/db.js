import mongoose from 'mongoose';

// MongoDB Connection with retry logic
const connectMongoDB = async (retries = 5) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    if (retries === 0) {
      console.error('MongoDB connection failed after retries:', err);
      process.exit(1);
    }
    console.log(`MongoDB connection attempt failed. Retrying... (${retries} attempts left)`);
    setTimeout(() => connectMongoDB(retries - 1), 5000);
  }
};

export { connectMongoDB };
