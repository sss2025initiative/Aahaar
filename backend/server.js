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
import adminRoutes from "./routes/adminRoutes.js";
import userStatsRoutes from "./routes/userStatsRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
const port = process.env.PORT || 5000;

connectDb();

const app = express();
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.header("Access-Control-Allow-Origin", origin || "http://localhost:5173");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Length, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/aahar/users', userRoutes);
app.use('/aahar/foodInfo', foodInfoRoutes);
app.use('/aahar/ngo', ngoRoutes);
app.use('/aahar/admin', adminRoutes);
app.use('/aahar/user-stats', userStatsRoutes);
app.use('/aahar/stats', statsRoutes);

app.get('/', (req, res) => {
  res.json({ message: "Welcome to Aahaar API. The server is running successfully." });
});

// Error handling middleware should be after all routes
app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
