import express from 'express';
import connectDb from './utils/db.js';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { errorHandler, notFound } from './middlewares/errorHandler.js';


dotenv.config();
const port = process.env.PORT || 5000;

connectDb();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}
);


