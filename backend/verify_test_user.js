import mongoose from 'mongoose';
import User from './models/userModel.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env'), override: true });

async function seedDonor() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    let user = await User.findOne({ email: 'donor123@gmail.com' });
    if (!user) {
      console.log('Creating donor123@gmail.com...');
      user = await User.create({
        firstName: 'Test',
        surname: 'Donor',
        age: 25,
        email: 'donor123@gmail.com',
        password: 'Password123',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
        isVerified: true,
        adharVerificationDocument: 'http://localhost:5001/uploads/test-aadhaar.pdf'
      });
      console.log('Created and verified test donor user:', user.email);
    } else {
      user.password = 'Password123';
      user.isVerified = true;
      await user.save();
      console.log('Donor already exists, password reset.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

seedDonor();
