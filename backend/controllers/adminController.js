import asyncHandler from "../middlewares/asyncHandler.js";
import User from "../models/userModel.js";

//get Ngos based on their cities
const getNgoBasedOnCity = asyncHandler(async(req, res) => {
    const userCity = req.user.city;
    const ngos = await Ngo.find({ city: userCity });
    if (ngos.length > 0) {
        res.status(200).json(ngos);
    } else {
        res.status(404).json({ message: "No NGOs found in your city" });
    }

})

//approve Ngo
const approveNgo = asyncHandler(async (req, res) => {
    const ngoId = req.params.id;
    const ngo = await Ngo.findById(ngoId);
    if (!ngo) {
        res.status(404).json({ message: "Ngo not found" });
    } else {
        ngo.isApproved = true;
        await ngo.save();
        res.status(200).json({ message: "Ngo approved successfully" });
    }
})

//getting users based on their cities
const getUsersBasedOnCity = asyncHandler(async (req, res) =>
{
    const userCity = req.user.city;
    const users = await User.find({ city: userCity });
    if (users.length > 0) {
        res.status(200).json(users);
    } else {
        res.status(404).json({ message: "No users found in your city" });
    }
}
)

//verify user 
const verifyUser = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
        res.status(404).json({ message: "User not found" });
    } else {
        user.isVerified = true;
        await user.save();
        res.status(200).json({ message: "User verified successfully" });
    }
})

export { getNgoBasedOnCity, approveNgo, getUsersBasedOnCity, verifyUser };