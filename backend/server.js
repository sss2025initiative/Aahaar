import dotenv from 'dotenv';
dotenv.config({ path: "./.env", override: true });
import path from 'path';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';

import connectDb from './utils/db.js';
import { initializeSocket } from './sockets/socket.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

import userRoutes from "./routes/userRoutes.js";
import foodInfoRoutes from "./routes/FoodInfoRoute.js";
import ngoRoutes from "./routes/ngoRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userStatsRoutes from "./routes/userStatsRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import ngoFoodRequestRoutes from "./routes/ngoFoodRequestRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

const port = process.env.PORT || 5000;

// Connect to MongoDB
connectDb();

const app = express();

// CORS setup
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
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
app.use('/uploads', express.static(path.join(path.resolve(), 'uploads')));

// Routes
app.use('/aahar/users', userRoutes);
app.use('/aahar/foodInfo', foodInfoRoutes);
app.use('/aahar/ngo', ngoRoutes);
app.use('/aahar/admin', adminRoutes);
app.use('/aahar/user-stats', userStatsRoutes);
app.use('/aahar/stats', statsRoutes);
app.use('/aahar/ngo-food-requests', ngoFoodRequestRoutes);
app.use('/aahar/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.json({ message: "Welcome to Aahaar API. The server is running successfully." });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// HTTP Server wrapper
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
