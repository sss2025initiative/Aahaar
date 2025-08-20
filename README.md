# AAHAAR: Food Donation Platform

AAHAAR is a food donation platform that connects food donors with NGOs and individuals in need. The platform helps reduce food waste by facilitating the donation of excess food to those who need it most.

## 🚀 Features

- User Authentication (Donors, NGOs, and Recipients)
- Food Donation Management
- Real-time Food Availability Tracking
- Location-based Food Distribution
- Contact Information Management
- Food Category Classification
- Status Tracking (Pending, In Transit, Delivered)

## 🛠 Tech Stack

### Backend

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- AWS S3 (for image storage)

### Frontend

- React.js
- Redux (State Management)
- Material-UI (UI Components)
- Axios (API Calls)

## 📁 Project Structure

```
Aahaar/
├── 📁 backend/
│   ├── 📁 controllers/
│   │   ├── 📄 adminController.js
│   │   ├── 📄 foodInfoController.js
│   │   ├── 📄 ngoController.js
│   │   ├── 📄 statsController.js
│   │   ├── 📄 taxController.js
│   │   ├── 📄 userController.js
│   │   └── 📄 userStatsController.js
│   ├── 📁 middlewares/
│   │   ├── 📄 asyncHandler.js
│   │   ├── 📄 authMiddleware.js
│   │   ├── 📄 errorHandler.js
│   │   └── 📄 isAdmin.js
│   ├── 📁 models/
│   │   ├── 📄 foodInfoModel.js
│   │   ├── 📄 ngoModel.js
│   │   ├── 📄 taxModel.js
│   │   └── 📄 userModel.js
│   ├── 📁 node_modules/ 🚫 (auto-hidden)
│   ├── 📁 routes/
│   │   ├── 📄 FoodInfoRoute.js
│   │   ├── 📄 adminRoutes.js
│   │   ├── 📄 ngoRoutes.js
│   │   ├── 📄 statsRoutes.js
│   │   ├── 📄 userRoutes.js
│   │   └── 📄 userStatsRoutes.js
│   ├── 📁 utils/
│   │   ├── 📄 db.js
│   │   ├── 📄 seedAdmin.js
│   │   └── 📄 token.js
│   ├── 🔒 .env 🚫 (auto-hidden)
│   ├── 🚫 .gitignore
│   ├── 📖 README.md
│   ├── 🖼️ logo.png
│   ├── 📄 package-lock.json
│   ├── 📄 package.json
│   ├── 📄 s3Config.js
│   ├── 📄 server.js
│   └── 📄 testing.js
└── 📖 README.md
```

## 🚀 Getting Started

### Backend Setup

1. Navigate to backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env` file with required variables:

   ```
   MONGO_URI=your_mongo_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=5000
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_BUCKET_NAME=your_s3_bucket_name
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## 📝 API Endpoints

### Food Information

- `POST /api/foodInfo/createFoodInfo` - Create new food donation
- `GET /api/foodInfo/getFoodInfo` - Get all food donations
- `GET /api/foodInfo/getFoodInfoById/:id` - Get specific food donation
- `PUT /api/foodInfo/updateFoodInfo/:id` - Update food donation
- `DELETE /api/foodInfo/deleteFoodInfo/:id` - Delete food donation

### User Management

- `POST /api/users/register` - Register new user
- `POST /api/users/auth` - User login
- `POST /api/users/logout` - User logout

### NGO Management

- `POST /api/ngo/aahaarNgoDocumentsUpload` - Upload NGO documents
- `POST /api/ngo/aahaarNgoDetails` - Register NGO details

## 📄 License

Licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

```mermaid
%%{init: {'theme': 'default', 'themeVariables': { 'actorMargin': 50, 'boxMargin': 10, 'messageMargin': 35, 'mirrorActors': false, 'bottomMarginAdj': 1, 'noteMargin': 10 }}}%%

sequenceDiagram
    participant Donor
    participant System
    participant Admin
    participant NGO
    participant TaxSystem
    participant S3Storage

    %% User Registration & Authentication Flow
    rect rgb(240, 240, 255)
    Note over Donor, System: User Registration & Authentication Flow
    Donor->>System: Register (name, email, password, phone)
    System->>System: Validate & Hash Password
    System->>System: Create User Account
    System->>Donor: Account Created Successfully
    Donor->>System: Login (email, password)
    System->>System: Verify Credentials
    System->>System: Generate JWT Token
    System->>Donor: Authentication Token
    end

    %% Document Verification Flow
    rect rgb(230, 245, 255)
    Note over Donor, System: Document Verification Flow
    Donor->>System: Upload Adhar Document
    System->>S3Storage: Store Document
    S3Storage->>System: Document URL
    System->>System: Update User Profile
    System->>Admin: Notification for Verification
    Admin->>System: Verify User Documents
    System->>Donor: Verification Status Update
    end

    %% Donation Creation Flow
    rect rgb(240, 255, 240)
    Note over Donor, System: Donation Creation Flow
    Donor->>System: Create Food Donation
    Note right of Donor: Includes food details, images, quantity
    System->>S3Storage: Upload Food Images
    S3Storage->>System: Image URLs
    System->>System: Store Donation (Pending Status)
    System->>Donor: Donation Created Successfully
    end

    %% Admin Review Flow
    rect rgb(255, 240, 240)
    Note over Admin, System: Admin Review Flow
    Admin->>System: Review Pending Donations
    System->>Admin: List of Pending Donations
    Admin->>System: Approve/Reject Donation
    System->>System: Update Donation Status
    System->>Donor: Notification of Approval/Rejection
    end

    %% NGO Registration & Management Flow
    rect rgb(255, 245, 230)
    Note over Admin, NGO: NGO Registration & Management Flow
    NGO->>System: Register NGO
    System->>S3Storage: Store NGO Documents
    S3Storage->>System: Document URLs
    System->>Admin: NGO Registration for Approval
    Admin->>System: Approve/Reject NGO
    System->>NGO: Registration Status
    end

    %% NGO Assignment Flow
    rect rgb(255, 255, 240)
    Note over Admin, NGO: NGO Assignment Flow
    Admin->>System: Assign Donation to NGO
    System->>NGO: Notification of Assignment
    NGO->>System: Accept Assignment
    NGO->>System: Update Delivery Status
    System->>Donor: Delivery Status Updates
    end

    %% Tax Benefits Flow
    rect rgb(240, 255, 255)
    Note over Donor, TaxSystem: Tax Benefits Flow
    System->>TaxSystem: Calculate Tax Exemption
    Note right of TaxSystem: Based on donation value, food categories, and quantity
    TaxSystem->>System: Tax Exemption Details
    System->>Donor: Tax Benefit Certificate
    Note right of Donor: Includes itemized exemptions and total tax benefit amount
    end

    %% User Statistics Tracking
    rect rgb(255, 240, 255)
    Note over Donor, System: User Statistics Tracking
    Donor->>System: Request Dashboard Stats
    System->>Donor: Monthly Donations, Categories, Tax Benefits
    end

    %% Admin Statistics Tracking
    rect rgb(245, 230, 255)
    Note over Admin, System: Admin Statistics Tracking
    Admin->>System: Request Platform Stats
    System->>Admin: Overall Platform Statistics (NGOs, Donors, Weekly/Monthly/Yearly Donations)
    end

    %% User Management Flow
    rect rgb(230, 255, 245)
    Note over Admin, System: User Management Flow
    Admin->>System: Get All Users
    System->>Admin: User List
    Admin->>System: Make/Remove Admin
    Admin->>System: Delete User
    Admin->>System: Verify User
    end
```
