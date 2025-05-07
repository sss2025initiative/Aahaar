import AWS from 'aws-sdk';
import multerS3 from 'multer-s3';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Detailed logging of environment variables
console.log('AWS Configuration Check:');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Present' : 'Missing');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Present' : 'Missing');
console.log('AWS_REGION:', process.env.AWS_REGION || 'Missing');
console.log('AWS_BUCKET_NAME:', process.env.AWS_BUCKET_NAME || 'Missing');


let uploadNgoDocuments;
let uploadFoodImages;

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

} catch (error) {
    console.error('Error configuring AWS:', error.message);
    throw error;
}

export { uploadNgoDocuments, uploadFoodImages };