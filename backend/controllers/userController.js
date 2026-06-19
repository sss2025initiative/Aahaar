import User from "../models/userModel.js";
import generateToken from "../utils/token.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import { getFileUrl } from "../s3Config.js";
import { notify } from "../services/notification.service.js";

//authenticate User
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email ? email.trim().toLowerCase() : "";
  const user = await User.findOne({ email: normalizedEmail });

  if (user && (await user.matchPassword(password))) {
    generateToken(res, user._id);

    res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      surname: user.surname,
      email: user.email,
      age: user.age,
      city: user.city,
      state: user.state,
      country: user.country,
      phone: user.phone,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      adharVerificationDocument: user.adharVerificationDocument,
      profileImage: user.profileImage,
      token: generateToken(res, user._id),
    });
  } else {
    res.status(401);
      throw new Error("Invalid email or password");
  }
});

//register User
const registerUser = asyncHandler(async (req, res) => {
  const { firstName, surname, email, password, age, city, state, country, phone } = req.body;
  const normalizedEmail = email ? email.trim().toLowerCase() : "";
  console.log("Register API requested with email:", normalizedEmail);

  const userExists = await User.findOne({ email: normalizedEmail });
  console.log("userExists query result:", userExists);
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  console.log("Attempting to create user in MongoDB...");
  let user;
  try {
    user = await User.create({
      firstName,
      surname,
      email: normalizedEmail,
      password,
      age,
      city,
      state,
      country,
      phone
    });
    console.log("User created successfully in DB:", user);
  } catch (err) {
    console.error("Database save failed during User.create:", err);
    res.status(500);
    throw new Error("Database save failed: " + err.message);
  }

  if (user) {
    // Notify user
    await notify({
      receiverId: user._id,
      receiverRole: 'donor',
      title: 'Verification Request',
      message: 'Your donor account verification is under review.',
      type: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user._id,
      priority: 'medium'
    });

    // Notify all Admins
    const admins = await User.find({ isAdmin: true });
    for (const admin of admins) {
      await notify({
        receiverId: admin._id,
        receiverRole: 'admin',
        title: 'New Donor Registration',
        message: 'New donor registration requires verification.',
        type: 'NEW_DONOR_REGISTRATION',
        entityType: 'User',
        entityId: user._id,
        priority: 'high'
      });
    }

    generateToken(res, user._id);
    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      surname: user.surname,
      email: user.email,
      age: user.age,
      city: user.city,
      state: user.state,  
      country: user.country,
      phone: user.phone,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      profileImage: user.profileImage,
      token: generateToken(res, user._id),
      message: "User registered successfully",
    });
  } else {
    res.status(404);
    throw new Error("Invalid user data");
  }
});

//logout User
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: process.env.NODE_ENV !== "development" ? "None" : "Lax",
    expires: new Date(0),
  });

  res.status(200).json({ message: "Logged Out successfully" });
});

//adhar verification Document upload
const uploadAdharDocument = asyncHandler(async (req, res) => {
  const files = req.files;
  if (files) {
    const filesUrls = {
      adharVerificationDocument: getFileUrl(files.adharVerificationDocument?.[0]),
    };
    
    // Save the document URL to the user record in database
    const user = await User.findById(req.user._id);
    if (user) {
      user.adharVerificationDocument = filesUrls.adharVerificationDocument;
      await user.save();

      // Notify user
      await notify({
        receiverId: user._id,
        receiverRole: 'donor',
        title: 'Document Uploaded',
        message: 'Your donor account verification is under review.',
        type: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user._id,
        priority: 'medium'
      });

      // Notify all Admins
      const admins = await User.find({ isAdmin: true });
      for (const admin of admins) {
        await notify({
          receiverId: admin._id,
          receiverRole: 'admin',
          title: 'Pending Verification',
          message: `${user.firstName} uploaded Aadhaar document. Pending verification.`,
          type: 'PENDING_VERIFICATION',
          entityType: 'User',
          entityId: user._id,
          priority: 'high'
        });
      }
    }

    res.status(200).json({
      message: "Files uploaded successfully",
      filesUrls,
    });
  } else {
    res.status(400).json({
      message: "No files uploaded",
    });
  }
});

//update user profile (name, address, phone, age — NOT email or documents)
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { firstName, surname, age, city, state, country, phone } = req.body;

  if (firstName !== undefined) user.firstName = firstName;
  if (surname !== undefined) user.surname = surname;
  if (age !== undefined) user.age = age;
  if (city !== undefined) user.city = city;
  if (state !== undefined) user.state = state;
  if (country !== undefined) user.country = country;
  if (phone !== undefined) user.phone = phone;

  // Handle profile image upload
  if (req.files?.profileImage?.[0]) {
    user.profileImage = getFileUrl(req.files.profileImage[0]);
  }

  const updatedUser = await user.save();

  res.status(200).json({
    _id: updatedUser._id,
    firstName: updatedUser.firstName,
    surname: updatedUser.surname,
    email: updatedUser.email,
    age: updatedUser.age,
    city: updatedUser.city,
    state: updatedUser.state,
    country: updatedUser.country,
    phone: updatedUser.phone,
    isVerified: updatedUser.isVerified,
    isAdmin: updatedUser.isAdmin,
    adharVerificationDocument: updatedUser.adharVerificationDocument,
    profileImage: updatedUser.profileImage,
    message: "Profile updated successfully"
  });
});

export { authUser, registerUser, logoutUser, uploadAdharDocument, updateUserProfile };
