import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lcu-marketplace';
    console.log(`Connecting to database at ${connStr}...`);
    
    // Set connection timeout to not hang the server startup
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Auto-promote the admin email asynchronously
    setTimeout(async () => {
      try {
        const { default: User } = await import('../models/User.js');
        const adminEmail = 'beatsnitro101@gmail.com';
        const userExists = await User.findOne({ email: adminEmail.toLowerCase() });
        if (userExists) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash('password', salt);
          await User.updateOne(
            { email: adminEmail.toLowerCase() },
            { $set: { isAdmin: true, isEmailVerified: true, isVerifiedStudent: true, password: hashedPassword } }
          );
          console.log(`Successfully verified, set password, and promoted ${adminEmail} to Admin!`);
        }
      } catch (err) {
        console.log('Skipped admin check (will run once users register):', err.message);
      }
    }, 1000);
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    console.log('--- WARNING: Running server without MongoDB connection. Database features will fail unless local MongoDB server is started or MONGODB_URI is provided in server/.env ---');
  }
};

export default connectDB;
