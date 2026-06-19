import dotenv from 'dotenv';
dotenv.config({ path: './.env', override: true });
import AWS from 'aws-sdk';
import multerS3 from 'multer-s3';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

let uploadNgoDocuments;
let uploadFoodImages;

const isAWSConfigured = process.env.AWS_ACCESS_KEY_ID && 
                        process.env.AWS_ACCESS_KEY_ID !== 'mock_key' && 
                        process.env.AWS_SECRET_ACCESS_KEY && 
                        process.env.AWS_SECRET_ACCESS_KEY !== 'mock_secret';

if (isAWSConfigured) {
  try {
    AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
    });

    const s3 = new AWS.S3();

    uploadNgoDocuments = multer({
        storage: multerS3({
            s3: s3,
            bucket: process.env.AWS_BUCKET_NAME,
            acl: 'public-read',
            key: (req, file, cb) => {
                cb(null, `ngos/${Date.now()}-${file.originalname}`);
            }
        })
    });
    uploadFoodImages = multer({
        storage: multerS3({
            s3: s3,
            bucket: process.env.AWS_BUCKET_NAME,
            acl: 'public-read',
            key: (req, file, cb) => {
                cb(null, `food/${Date.now()}-${file.originalname}`);
            }
        })
    });
    console.log('AWS S3 storage configured successfully.');
  } catch (error) {
    console.error('Error configuring AWS S3, falling back to local storage:', error.message);
    configureLocalStorage();
  }
} else {
  console.log('AWS credentials not configured or mock. Using local storage fallback.');
  configureLocalStorage();
}

function configureLocalStorage() {
  const uploadsDir = path.join(path.resolve(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const localStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  });

  uploadNgoDocuments = multer({ storage: localStorage });
  uploadFoodImages = multer({ storage: localStorage });
}

const getFileUrl = (file) => {
  if (!file) return null;
  return file.location || `http://localhost:${process.env.PORT || 5001}/uploads/${file.filename}`;
};

export { uploadNgoDocuments, uploadFoodImages, getFileUrl };
