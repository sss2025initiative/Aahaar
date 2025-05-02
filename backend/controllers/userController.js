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
      isAdmin: user.isAdmin,
      token: generateToken(res, user._id),
    });
  } else {
    res.status(401);
      throw new Error("Invalid email or password");
  }
});
//register User

const registerUser = asyncHandler(async (req, res) => {
  const { firstName, surname, email, password, age } = req.body;

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
  });

  if (user) {
    generateToken(res, user._id);
    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      surname: user.surname,
      email: user.email,
      age: user.age,
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

export { authUser, registerUser, logoutUser };