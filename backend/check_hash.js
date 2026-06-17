import mongoose from 'mongoose';
import User from './models/userModel.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env'), override: true });

async function checkHash() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const user = await User.findOne({ email: 'santoshpatelvns5@gmail.com' });
    if (user) {
      console.log('Email:', user.email);
      console.log('Hash in DB:', user.password);
      
      const isMatch = await bcrypt.compare('Password123', user.password);
      console.log('Compare with Password123:', isMatch);
    } else {
      console.log('User not found.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkHash();
