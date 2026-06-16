import User from "../models/userModel.js";
import generateToken from "../utils/token.js";
import asyncHandler from "../middlewares/asyncHandler.js";

//authenticate User
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

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
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      adharVerificationDocument: user.adharVerificationDocument,
      token: generateToken(res, user._id),
    });
  } else {
    res.status(401);
      throw new Error("Invalid email or password");
  }
});

//register User
const registerUser = asyncHandler(async (req, res) => {
  const { firstName, surname, email, password, age,city,state,country} = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({
    firstName,
    surname,
    email,
    password,
    age,
    city,
    state,
    country
  });

  if (user) {
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
      isAdmin: user.isAdmin,
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
    expires: new Date(0),
  });

  res.status(200).json({ message: "Logged Out successfully" });
});

//adhar verification Document upload
const uploadAdharDocument = asyncHandler(async (req, res) => {
  const files = req.files;
  if (files) {
    const filesUrls = {
      adharVerificationDocument: files.adharVerificationDocument?.[0]?.location,
    };
    
    // Save the document URL to the user record in database
    const user = await User.findById(req.user._id);
    if (user) {
      user.adharVerificationDocument = filesUrls.adharVerificationDocument;
      await user.save();
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
}
);

// Simulate sending OTP for Aadhaar verification
const sendAadhaarOtp = asyncHandler(async (req, res) => {
  const { aadhaarNumber } = req.body;
  if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
    res.status(400);
    throw new Error("Please enter a valid 12-digit Aadhaar number");
  }
  res.status(200).json({
    success: true,
    message: "Mock OTP sent to mobile registered with Aadhaar ending in " + aadhaarNumber.slice(-4),
  });
});

// Simulate verifying OTP for Aadhaar verification
const verifyAadhaarOtp = asyncHandler(async (req, res) => {
  const { aadhaarNumber, otp } = req.body;
  if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber) || !otp) {
    res.status(400);
    throw new Error("Aadhaar number and OTP are required");
  }

  if (otp !== "123456") {
    res.status(400);
    throw new Error("Invalid OTP. For demo purposes, use OTP: 123456");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.isVerified = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Aadhaar verified successfully!",
    user: {
      _id: user._id,
      firstName: user.firstName,
      surname: user.surname,
      email: user.email,
      age: user.age,
      city: user.city,
      state: user.state,
      country: user.country,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      adharVerificationDocument: user.adharVerificationDocument,
    }
  });
});

export { authUser, registerUser, logoutUser, uploadAdharDocument, sendAadhaarOtp, verifyAadhaarOtp };
