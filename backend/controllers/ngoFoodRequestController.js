import asyncHandler from "../middlewares/asyncHandler.js";
import NgoFoodRequest from "../models/ngoFoodRequestModel.js";
import Ngo from "../models/ngoModel.js";

// @desc    Create a food request (NGO only, must be approved)
// @route   POST /aahar/ngo-food-requests/create
// @access  Private
const createNgoFoodRequest = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Find an approved NGO registered by this user's email
  const { ngoEmail } = req.body;
  
  // Find NGO - either by provided email or look up from the user-associated NGO
  let ngo = null;
  if (ngoEmail) {
    ngo = await Ngo.findOne({ ngoEmail, isApproved: true });
  }
  
  if (!ngo) {
    // Try to find any approved NGO in the city matching the user
    ngo = await Ngo.findOne({ 
      ngoCity: req.user.city, 
      isApproved: true,
      ngoEmail: req.user.email 
    });
  }

  if (!ngo) {
    res.status(403);
    throw new Error(
      "No approved NGO found associated with your account. Your NGO registration must be approved by an admin before you can submit food requests."
    );
  }

  const {
    foodItemsNeeded,
    contactPersonName,
    phoneNumber,
    email,
    deliveryAddress,
    city,
    purpose,
    urgencyLevel,
    numberOfBeneficiaries,
  } = req.body;

  // Validate required fields
  if (
    !foodItemsNeeded ||
    !Array.isArray(foodItemsNeeded) ||
    foodItemsNeeded.length === 0
  ) {
    res.status(400);
    throw new Error("Please provide at least one food item needed.");
  }

  if (!contactPersonName || !phoneNumber || !email || !deliveryAddress || !city) {
    res.status(400);
    throw new Error("All contact and delivery details are required.");
  }

  if (!purpose || !purpose.trim()) {
    res.status(400);
    throw new Error("Please describe the purpose of this food request.");
  }

  const request = await NgoFoodRequest.create({
    ngoId: ngo._id,
    requestedBy: userId,
    foodItemsNeeded,
    contactDetails: {
      contactPersonName,
      phoneNumber,
      email,
      deliveryAddress,
      city,
    },
    purpose,
    urgencyLevel: urgencyLevel || "medium",
    numberOfBeneficiaries: numberOfBeneficiaries || 0,
    status: "pending",
  });

  res.status(201).json({
    message: "Food request submitted successfully. Admin will review it shortly.",
    request,
    ngo: { ngoName: ngo.ngoName, ngoCity: ngo.ngoCity },
  });
});

// @desc    Get all food requests for the NGO associated with current user
// @route   GET /aahar/ngo-food-requests/my-requests
// @access  Private
const getMyNgoFoodRequests = asyncHandler(async (req, res) => {
  // Find the NGO associated with this user
  const ngo = await Ngo.findOne({ 
    ngoEmail: req.user.email 
  });

  if (!ngo) {
    return res.status(200).json({
      requests: [],
      ngo: null,
      message: "No NGO found associated with your account.",
    });
  }

  const requests = await NgoFoodRequest.find({ ngoId: ngo._id })
    .sort({ createdAt: -1 })
    .populate("approvedBy", "firstName surname")
    .populate("rejectedBy", "firstName surname");

  res.status(200).json({
    requests,
    ngo: {
      _id: ngo._id,
      ngoName: ngo.ngoName,
      ngoEmail: ngo.ngoEmail,
      ngoCity: ngo.ngoCity,
      ngoState: ngo.ngoState,
      ngoPhone: ngo.ngoPhone,
      ngoPurpose: ngo.ngoPurpose,
      ngoWebsite: ngo.ngoWebsite,
      isApproved: ngo.isApproved,
    },
    message: "Requests fetched successfully",
  });
});

// @desc    Get NGO status for the current user
// @route   GET /aahar/ngo-food-requests/ngo-status
// @access  Private
const getNgoStatus = asyncHandler(async (req, res) => {
  const ngo = await Ngo.findOne({ ngoEmail: req.user.email });
  
  if (!ngo) {
    return res.status(200).json({ ngo: null, message: "No NGO found" });
  }

  res.status(200).json({
    ngo: {
      _id: ngo._id,
      ngoName: ngo.ngoName,
      ngoEmail: ngo.ngoEmail,
      ngoCity: ngo.ngoCity,
      ngoState: ngo.ngoState,
      ngoPhone: ngo.ngoPhone,
      ngoPurpose: ngo.ngoPurpose,
      ngoWebsite: ngo.ngoWebsite,
      isApproved: ngo.isApproved,
      createdAt: ngo.createdAt,
    },
    message: "NGO status fetched",
  });
});

export { createNgoFoodRequest, getMyNgoFoodRequests, getNgoStatus };
