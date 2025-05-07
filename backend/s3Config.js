import dotenv from 'dotenv';
dotenv.config();    
import AWS from 'aws-sdk';
import multerS3 from 'multer-s3';
import multer from 'multer';
let uploadDocumentsToS3;

try {
    AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
    });

    const s3 = new AWS.S3();

    uploadDocumentsToS3 = multer({
        storage: multerS3({
            s3: s3,
            bucket: process.env.S3_BUCKET_NAME,
            acl: 'public-read',
            key: (req, file, cb) => {
                cb(null, `ngos/${Date.now()}-${file.originalname}`);
            }
        })
    });
} catch (error) {
    console.error('Error configuring AWS:', error.message);
    throw error;
}

export { uploadDocumentsToS3 };