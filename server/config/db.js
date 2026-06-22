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
    
    // Auto-promote the specified admin email account if it exists
    try {
      const User = mongoose.model('User');
      if (User) {
        const adminEmail = 'beatsnitro101@gmail.com';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password', salt);
        const result = await User.updateOne(
          { email: adminEmail.toLowerCase() },
          { $set: { isAdmin: true, isEmailVerified: true, isVerifiedStudent: true, password: hashedPassword } }
        );
        if (result.matchedCount > 0) {
          console.log(`Successfully verified, set password, and promoted ${adminEmail} to Admin!`);
        }
      }
    } catch (e) {
      // Model might not be loaded yet, we can import it dynamically
      try {
        const { default: User } = await import('../models/User.js');
        const { default: bcrypt } = await import('bcryptjs');
        const adminEmail = 'beatsnitro101@gmail.com';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password', salt);
        const result = await User.updateOne(
          { email: adminEmail.toLowerCase() },
          { $set: { isAdmin: true, isEmailVerified: true, isVerifiedStudent: true, password: hashedPassword } }
        );
        if (result.matchedCount > 0) {
          console.log(`Successfully verified, set password, and promoted ${adminEmail} to Admin (dynamically loaded model)!`);
        }
      } catch (err) {
        console.error('Failed to auto-promote admin email:', err.message);
      }
    }
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    console.log('--- WARNING: Running server without MongoDB connection. Database features will fail unless local MongoDB server is started or MONGODB_URI is provided in server/.env ---');
  }
};

export default connectDB;
