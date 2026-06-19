import mongoose from 'mongoose';
import User from './models/userModel.js';
import Ngo from './models/ngoModel.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env'), override: true });

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    // Seed NGO if none exists
    const ngoCount = await Ngo.countDocuments();
    if (ngoCount === 0) {
      console.log('No NGOs found. Seeding a mock approved NGO in Delhi...');
      await Ngo.create({
        ngoName: 'Delhi Feed Foundation',
        ngoEmail: 'contact@delhifeed.org',
        ngoPhone: '9876543210',
        ngoAddress: '12, Connaught Place, New Delhi',
        ngoCity: 'Delhi',
        ngoState: 'Delhi',
        ngoPurpose: 'Provide meals to needy families and street children.',
        ngoWebsite: 'https://delhifeed.org',
        ngoDocuments: {
          certificationOfRegistration: 'http://localhost:5001/uploads/cert.pdf',
          ownerPanCard: 'http://localhost:5001/uploads/pan.pdf',
          prevousWorkReport: 'http://localhost:5001/uploads/report.pdf'
        },
        isApproved: true
      });
      console.log('Mock NGO seeded successfully.');
    } else {
      console.log(`Found ${ngoCount} NGOs in DB.`);
    }

    const users = await User.find({}, '-password');
    console.log('All Users:', JSON.stringify(users, null, 2));
    
    const ngos = await Ngo.find({});
    console.log('All NGOs:', JSON.stringify(ngos, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

seedData();