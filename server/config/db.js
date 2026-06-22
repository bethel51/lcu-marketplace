import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lcu-marketplace';
    console.log(`Connecting to database at ${connStr}...`);
    
    // Set connection timeout to not hang the server startup
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    console.log('--- WARNING: Running server without MongoDB connection. Database features will fail unless local MongoDB server is started or MONGODB_URI is provided in server/.env ---');
  }
};

export default connectDB;
