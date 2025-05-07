import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Create admin user if none exists
const seedAdmin = async () => {
  try {
    await connectDB();
    
    // Check if admin user already exists
    const adminExists = await User.findOne({ isAdmin: true });
    
    if (adminExists) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    // Admin user details - update these as needed
    const adminUser = {
      firstName: 'sss',
      surname: 'sss',
      email: 'sss.initiative.2025@gmail.com',
      password: 'sss@2025', // This will be hashed by the pre-save hook
      age: 30,
      isAdmin: true
    };
    
    // Create admin user
    await User.create(adminUser);
    
    console.log('Admin user created successfully');
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Run the seed function
seedAdmin();
