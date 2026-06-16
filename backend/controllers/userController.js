import User from "../models/userModel.js";
import generateToken from "../utils/token.js";
<<<<<<< HEAD
import asyncHandler from "../middlewares/asyncHandler.js";

//authenticate User
=======


>>>>>>> santosh/main
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
<<<<<<< HEAD
      city: user.city,
      state: user.state,
      country: user.country,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      adharVerificationDocument: user.adharVerificationDocument,
      token: generateToken(res, user._id),
=======
      isAdmin: user.isAdmin,
>>>>>>> santosh/main
    });
  } else {
    res.status(401);
      throw new Error("Invalid email or password");
  }
});
<<<<<<< HEAD
//register User

const registerUser = asyncHandler(async (req, res) => {
  const { firstName, surname, email, password, age,city,state,country} = req.body;
=======


const registerUser = asyncHandler(async (req, res) => {
  const { firstName, surname, email, password, age } = req.body;
>>>>>>> santosh/main

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
<<<<<<< HEAD
    city,
    state,
    country
=======
>>>>>>> santosh/main
  });

  if (user) {
    generateToken(res, user._id);
    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      surname: user.surname,
      email: user.email,
      age: user.age,
<<<<<<< HEAD
      city: user.city,
      state: user.state,  
      country: user.country,
      isAdmin: user.isAdmin,
      token: generateToken(res, user._id),
      message: "User registered successfully",
=======
>>>>>>> santosh/main
    });
  } else {
    res.status(404);
    throw new Error("Invalid user data");
  }
});

<<<<<<< HEAD
//logout User
=======

>>>>>>> santosh/main
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({ message: "Logged Out successfully" });
});

<<<<<<< HEAD
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



export { authUser, registerUser, logoutUser, uploadAdharDocument };
=======
export { authUser, registerUser, logoutUser };
>>>>>>> santosh/main
