import dotenv from 'dotenv';
dotenv.config({path: "./utils/.env" });
import path from 'path';

import express from 'express';
import connectDb from './utils/db.js';
import cookieParser from 'cookie-parser';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import userRoutes from "./routes/userRoutes.js";
import foodInfoRoutes from "./routes/FoodInfoRoute.js";
import ngoRoutes from "./routes/ngoRoutes.js";

const port = process.env.PORT || 5000;

connectDb();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/aahar/users', userRoutes);
app.use('/aahar/foodInfo', foodInfoRoutes);
app.use('/aahar/ngo', ngoRoutes);

// Error handling middleware should be after all routes
app.use(notFound);
app.use(errorHandler);

console.log(process.env.PORT);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
