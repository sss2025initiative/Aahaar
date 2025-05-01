
# ![AAHAAR Logo](logo.png)
# AAHAAR: Backend

> This is the backend structure for the AAHAAR project, which handles user management, authentication, and utility services using Node.js, Express, and MongoDB.

---

## 📁 Folder Structure

```
aahaar-backend/
│
├── controllers/                      # Handles business logic
│   └── userController.js             # Controller for user operations
│
├── middlewares/                     # Custom middleware functions
│   ├── asyncHandler.js              # Error handler for async functions
│   ├── authMiddleware.js            # Middleware for user authentication
│   └── errorHandler.js              # Centralized error handler
│
├── models/                          # Mongoose schema definitions
│   └── userModel.js                 # Schema for user data
│
├── routes/                          # API route definitions
│   └── userRoutes.js                # Routes for user-related requests
│
├── utils/                           # Utility functions and database configuration
│   ├── db.js                        # MongoDB connection
│   └── token.js                     # JWT token generation logic
│
├── package.json                     # Project metadata and scripts
├── package-lock.json                # Exact dependency tree
└── server.js                        # Application entry point
```

---

## 🛠 Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication

---

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/aahaar-backend.git
   cd aahaar-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in a `.env` file:
   ```
   MONGO_URI=your_mongo_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

---

## 📄 License

Licensed under the MIT License.
