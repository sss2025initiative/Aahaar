import asyncHandler from "../middlewares/asyncHandler.js";
import User from "../models/userModel.js";
import FoodInfo from "../models/foodInfoModel.js";
import Ngo from "../models/ngoModel.js";
import NgoFoodRequest from "../models/ngoFoodRequestModel.js";

// Get all NGOs (admin can manage all NGOs regardless of city)
const getNgoBasedOnCity = asyncHandler(async(req, res) => {
    const ngos = await Ngo.find({}).populate('registeredBy', 'firstName surname email');
    res.status(200).json(ngos);
})

//approve Ngo
const approveNgo = asyncHandler(async (req, res) => {
    const ngoId = req.params.id;
    const ngo = await Ngo.findById(ngoId);
    if (!ngo) {
        res.status(404).json({ message: "Ngo not found" });
    } else {
        ngo.isApproved = true;
        ngo.approvedAt = new Date();
        ngo.approvedBy = req.user._id;
        await ngo.save();
        res.status(200).json({ message: "Ngo approved successfully", ngo });
    }
})

//getting users based on their cities
const getUsersBasedOnCity = asyncHandler(async (req, res) => {
    const userCity = req.user.city;
    const users = await User.find({ city: userCity });
    res.status(200).json(users);
})

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



// @desc    Get all users (admin only)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');// exclude password from the response
  
  res.status(200).json({
    users,
    message: "Users fetched successfully"
  });
});

// @desc    Set user as admin
// @route   PUT /api/admin/users/:userId/make-admin
// @access  Private/Admin
const makeUserAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const user = await User.findById(userId);
  // check if user exists
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  
  user.isAdmin = true;
  await user.save();
  
  res.status(200).json({
    message: "User set as admin successfully",
    user: {
      _id: user._id,
      firstName: user.firstName,
      surname: user.surname,
      email: user.email,
      isAdmin: user.isAdmin
    }
  });
});

// @desc    Get food info by city
const getFoodInfoByCity=asyncHandler(async(req ,res)=>{
    const city = req.user.city;
    const foodInfo=await FoodInfo.find({ "contactDetails.city": city }).sort({ createdAt: -1 });
    return res.status(200).json({
        foodInfo,
        message: "Food info fetched successfully"
    });
})


// @desc    Remove admin privileges from user
// @route   PUT /api/admin/users/:userId/remove-admin
// @access  Private/Admin
const removeAdminPrivileges = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const user = await User.findById(userId);
  
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  
  // Prevent removing admin privileges from self
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error("You cannot remove your own admin privileges");
  }
  
  user.isAdmin = false;
  await user.save();
  
  res.status(200).json({
    message: "Admin privileges removed successfully",
    user: {
      _id: user._id,
      firstName: user.firstName,
      surname: user.surname,
      email: user.email,
      isAdmin: user.isAdmin
    }
  });
});

// @desc    Delete user (admin only)
// @route   DELETE /api/admin/users/:userId
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  // find user by id
  const user = await User.findById(userId);
  // check if user exists
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  // Prevent deleting self
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error("You cannot delete your own account");
  }
  
  await User.deleteOne({ _id: userId });
  
  res.status(200).json({
    message: "User deleted successfully"
  });
});


// @desc    Approve a food donation
// @route   PUT /api/admin/food-donations/:donationId/approve
// @access  Private/Admin
const approveFoodDonation = asyncHandler(async (req, res) => {
  const { donationId } = req.params;
  
  const donation = await FoodInfo.findById(donationId);
  
  if (!donation) {
    res.status(404);
    throw new Error("Donation not found");
  }
  
  if (donation.isApproved) {
    res.status(400);
    throw new Error("Donation already approved");
  }
  
  donation.isApproved = true;
  donation.status = 'approved';
  donation.adminInReview = false;
  donation.approvedBy = req.user._id;
  donation.approvedAt = new Date();
  
  await donation.save();
  
  res.status(200).json({
    message: "Food donation approved successfully",
    donation
  });
});

const updateFoodInfoQuantity = asyncHandler(async (req, res) => {
  const { donationId } = req.params;
  const { foodItems } = req.body;
  
  if (!donationId || !foodItems || !Array.isArray(foodItems) || foodItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide donationId and an array of foodItems"
    });
  }
  
  const donation = await FoodInfo.findById(donationId);
  
  if (!donation) {
    return res.status(404).json({
      success: false,
      message: "Donation not found"
    });
  }
  const updatedItems = [];
  
  for (const item of foodItems) {
    const { foodItemId, quantity, quantityType } = item;
    
    const foodItemIndex = donation.foodItemDetails.findIndex(
      detail => detail._id.toString() === foodItemId
    );
    
    donation.foodItemDetails[foodItemIndex].quantity = quantity;
    donation.foodItemDetails[foodItemIndex].quantityType = quantityType;
    
    updatedItems.push({
      foodItemId,
      foodName: donation.foodItemDetails[foodItemIndex].foodName,
      quantity,
      quantityType
    });
  }
  
  if (updatedItems.length > 0) {
    await donation.save();
  }
  
  const response = {
    success: updatedItems.length > 0,
    message: updatedItems.length > 0 
      ? `Successfully updated ${updatedItems.length} food item(s)` 
      : "No food items were updated",
  };
  
  res.status(updatedItems.length > 0 ? 200 : 400).json(response);
});

// @desc    Reject a food donation
// @route   PUT /api/admin/food-donations/:donationId/reject
// @access  Private/Admin
const rejectFoodDonation = asyncHandler(async (req, res) => {
  const { donationId } = req.params;
  const { rejectionReason } = req.body;
  
  const donation = await FoodInfo.findById(donationId);
  
  if (!donation) {
    res.status(404);
    throw new Error("Donation not found");
  }
  
  if (donation.status === 'rejected') {
    res.status(400);
    throw new Error("Donation already rejected");
  }
  
  donation.status = 'rejected';
  donation.isApproved = false;
  donation.adminInReview = false;
  donation.rejectedReason = rejectionReason || "No reason provided";
  donation.rejectedBy = req.user._id;
  donation.rejectedAt = new Date();
  
  await donation.save();
  
  res.status(200).json({
    message: "Food donation rejected successfully",
    donation
  });
});

const triggerInReview = asyncHandler(async (req, res) => {
  const { donationId } = req.params;

  const donation = await FoodInfo.findById(donationId);
  if (!donation) {
    res.status(404);
    throw new Error("Donation not found");
  }
  donation.adminInReview = !donation.adminInReview;
  await donation.save();
  res.status(200).json({
    message: "Food donation in review successfully",
    donation
  });
})

// @desc    Mark a food donation as done
// @route   PUT /api/admin/food-donations/:donationId/done
// @access  Private/Admin
const completeFoodDonation = asyncHandler(async (req, res) => {
  const { donationId } = req.params;

  const donation = await FoodInfo.findById(donationId);
  if (!donation) {
    res.status(404);
    throw new Error("Donation not found");
  }

  donation.status = 'done';
  donation.adminInReview = false;
  donation.completedAt = new Date();

  await donation.save();
  res.status(200).json({
    message: "Food donation marked as done successfully",
    donation
  });
});

// @desc    Get all NGO food requests (admin — shows all, no city filter)
// @route   GET /api/admin/ngo-food-requests
// @access  Private/Admin
const getAllNgoFoodRequests = asyncHandler(async (req, res) => {
  const requests = await NgoFoodRequest.find({})
    .sort({ createdAt: -1 })
    .populate('ngoId', 'ngoName ngoEmail ngoCity ngoState ngoPhone isApproved registeredBy')
    .populate('requestedBy', 'firstName surname email')
    .populate('approvedBy', 'firstName surname')
    .populate('rejectedBy', 'firstName surname')
    .populate('acceptedBy', 'firstName surname email phone');
  res.status(200).json({ requests, message: 'NGO food requests fetched successfully' });
});

// @desc    Approve an NGO food request
// @route   PUT /api/admin/ngo-food-requests/:id/approve
// @access  Private/Admin
const approveNgoFoodRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const request = await NgoFoodRequest.findById(id);
  if (!request) { res.status(404); throw new Error('Request not found'); }
  if (request.status !== 'pending') { res.status(400); throw new Error('Request already processed'); }
  request.status = 'approved';
  request.approvedBy = req.user._id;
  request.approvedAt = new Date();
  request.adminInReview = false;
  await request.save();
  res.status(200).json({ message: 'NGO food request approved', request });
});

// @desc    Reject an NGO food request
// @route   PUT /api/admin/ngo-food-requests/:id/reject
// @access  Private/Admin
const rejectNgoFoodRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;
  const request = await NgoFoodRequest.findById(id);
  if (!request) { res.status(404); throw new Error('Request not found'); }
  if (request.status === 'rejected') { res.status(400); throw new Error('Already rejected'); }
  request.status = 'rejected';
  request.rejectedBy = req.user._id;
  request.rejectedAt = new Date();
  request.rejectedReason = rejectionReason || 'No reason provided';
  request.adminInReview = false;
  await request.save();
  res.status(200).json({ message: 'NGO food request rejected', request });
});

// @desc    Mark an NGO food request as fulfilled
// @route   PUT /api/admin/ngo-food-requests/:id/fulfill
// @access  Private/Admin
const fulfillNgoFoodRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { adminNotes } = req.body;
  const request = await NgoFoodRequest.findById(id);
  if (!request) { res.status(404); throw new Error('Request not found'); }
  if (request.status !== 'approved') { res.status(400); throw new Error('Request must be approved before fulfillment'); }
  request.status = 'fulfilled';
  request.fulfilledAt = new Date();
  if (adminNotes) request.adminNotes = adminNotes;
  await request.save();
  res.status(200).json({ message: 'NGO food request marked as fulfilled', request });
});

// @desc    Toggle admin review flag for NGO food request
// @route   PUT /api/admin/ngo-food-requests/:id/toggle-review
// @access  Private/Admin
const toggleNgoRequestReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const request = await NgoFoodRequest.findById(id);
  if (!request) { res.status(404); throw new Error('Request not found'); }
  request.adminInReview = !request.adminInReview;
  await request.save();
  res.status(200).json({ message: 'Review status toggled', request });
});

export { 
  getAllUsers, 
  makeUserAdmin, 
  removeAdminPrivileges, 
  deleteUser,
  approveFoodDonation,
  rejectFoodDonation,
  getNgoBasedOnCity,
  approveNgo,
  getUsersBasedOnCity,
  verifyUser,
  getFoodInfoByCity,
  updateFoodInfoQuantity,
  triggerInReview,
  completeFoodDonation,
  getAllNgoFoodRequests,
  approveNgoFoodRequest,
  rejectNgoFoodRequest,
  fulfillNgoFoodRequest,
  toggleNgoRequestReview
};