import asyncHandler from "../middlewares/asyncHandler.js";
import NgoFoodRequest from "../models/ngoFoodRequestModel.js";
import Ngo from "../models/ngoModel.js";

// Helper: find the NGO registered by the current user
// Priority order:
//   1. registeredBy: userId  (reliable — set for all new NGOs)
//   2. ngoEmail from request body (user explicitly provides it on the form)
//   3. ngoEmail matches user.email  (fallback for same-email registrations)
//   4. ngoCity + ngoPhone overlap (last resort for legacy records)
const findUserNgo = async (req, requireApproved = false) => {
  const userId = req.user._id;

  // 1. Most reliable — direct user link
  const q1 = requireApproved
    ? { registeredBy: userId, isApproved: true }
    : { registeredBy: userId };
  let ngo = await Ngo.findOne(q1);
  if (ngo) return ngo;

  // 2. ngoEmail passed in body / query (form sends it)
  const bodyNgoEmail = req.body?.ngoEmail || req.query?.ngoEmail;
  if (bodyNgoEmail) {
    const q2 = requireApproved
      ? { ngoEmail: bodyNgoEmail, isApproved: true }
      : { ngoEmail: bodyNgoEmail };
    ngo = await Ngo.findOne(q2);
    if (ngo) {
      // Opportunistically backfill registeredBy so future lookups are fast
      if (!ngo.registeredBy) {
        ngo.registeredBy = userId;
        await ngo.save().catch(() => {}); // best-effort, ignore errors
      }
      return ngo;
    }
  }

  // 3. User account email matches NGO email (same-email registrations)
  if (req.user.email) {
    const q3 = requireApproved
      ? { ngoEmail: req.user.email, isApproved: true }
      : { ngoEmail: req.user.email };
    ngo = await Ngo.findOne(q3);
    if (ngo) {
      if (!ngo.registeredBy) { ngo.registeredBy = userId; await ngo.save().catch(() => {}); }
      return ngo;
    }
  }

  // 4. Last resort: NGO whose ngoPhone matches user.phone AND city matches (for legacy records)
  if (req.user.phone && req.user.city) {
    const q4 = requireApproved
      ? { ngoPhone: req.user.phone, isApproved: true }
      : { ngoPhone: req.user.phone };
    ngo = await Ngo.findOne(q4);
    if (ngo) {
      if (!ngo.registeredBy) { ngo.registeredBy = userId; await ngo.save().catch(() => {}); }
      return ngo;
    }
  }

  return null;
};

// @desc    Create a food request (NGO only, must be approved)
// @route   POST /aahar/ngo-food-requests/create
// @access  Private
const createNgoFoodRequest = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const ngo = await findUserNgo(req, true); // requireApproved = true

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

  if (!foodItemsNeeded || !Array.isArray(foodItemsNeeded) || foodItemsNeeded.length === 0) {
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
    contactDetails: { contactPersonName, phoneNumber, email, deliveryAddress, city },
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
  const ngo = await findUserNgo(req, false);

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
    .populate("rejectedBy", "firstName surname")
    .populate("acceptedBy", "firstName surname email");

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
      ngoDocuments: ngo.ngoDocuments,
      isApproved: ngo.isApproved,
    },
    message: "Requests fetched successfully",
  });
});

// @desc    Get NGO status for the current user
// @route   GET /aahar/ngo-food-requests/ngo-status
// @access  Private
const getNgoStatus = asyncHandler(async (req, res) => {
  const ngo = await findUserNgo(req, false);

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
      ngoDocuments: ngo.ngoDocuments,
      isApproved: ngo.isApproved,
      createdAt: ngo.createdAt,
    },
    message: "NGO status fetched",
  });
});

// @desc    Mark own NGO food request as fulfilled/completed
// @route   PUT /aahar/ngo-food-requests/:id/fulfill
// @access  Private
const fulfillMyNgoFoodRequest = asyncHandler(async (req, res) => {
  const requestId = req.params.id;

  // Find the NGO associated with current user
  const ngo = await findUserNgo(req, false);
  if (!ngo) {
    res.status(404);
    throw new Error("No NGO found associated with your account.");
  }

  // Find the food request
  const request = await NgoFoodRequest.findById(requestId);
  if (!request) {
    res.status(404);
    throw new Error("Food request not found.");
  }

  // Verify that this request belongs to the user's NGO
  if (request.ngoId.toString() !== ngo._id.toString()) {
    res.status(403);
    throw new Error("You are not authorized to fulfill this request.");
  }

  // Only approved requests can be marked as fulfilled
  if (request.status !== "approved") {
    res.status(400);
    throw new Error("Request must be approved before it can be marked as completed.");
  }

  request.status = "fulfilled";
  request.fulfilledAt = new Date();
  await request.save();

  res.status(200).json({
    message: "NGO food request marked as completed ✅",
    request,
  });
});

const getActiveNgoFoodRequests = asyncHandler(async (req, res) => {
  const requests = await NgoFoodRequest.find({ status: "approved", acceptedBy: null })
    .sort({ createdAt: -1 })
    .populate("ngoId", "ngoName ngoCity ngoState ngoPurpose ngoPhone ngoEmail");

  res.status(200).json({
    requests,
    message: "Active food requests fetched successfully"
  });
});

const acceptNgoFoodRequest = asyncHandler(async (req, res) => {
  const { expectedDeliveryDate } = req.body;
  const requestId = req.params.id;

  if (!expectedDeliveryDate) {
    res.status(400);
    throw new Error("Expected delivery date and time is required.");
  }

  const request = await NgoFoodRequest.findById(requestId);
  if (!request) {
    res.status(404);
    throw new Error("Food request not found.");
  }

  if (request.status !== "approved") {
    res.status(400);
    throw new Error("Only approved requests can be accepted for donation.");
  }

  if (request.acceptedBy) {
    res.status(400);
    throw new Error("This request has already been accepted by another donor.");
  }

  const generateUniqueRequestToken = async () => {
    let token;
    let exists = true;
    while (exists) {
      token = Math.random().toString(36).substring(2, 8).toUpperCase();
      const found = await NgoFoodRequest.findOne({ verificationToken: token });
      if (!found) exists = false;
    }
    return token;
  };

  const token = await generateUniqueRequestToken();

  request.acceptedBy = req.user._id;
  request.acceptedAt = new Date();
  request.expectedDeliveryDate = new Date(expectedDeliveryDate);
  request.verificationToken = token;
  await request.save();
  await request.populate("ngoId", "ngoName ngoCity ngoState ngoPhone ngoEmail");

  res.status(200).json({
    message: "Food request accepted! Thank you for your donation.",
    request
  });
});

const verifyNgoFoodRequestFulfillment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { token } = req.body;

  if (!token) {
    res.status(400);
    throw new Error("Verification token is required.");
  }

  const ngo = await findUserNgo(req, false);
  if (!ngo && !req.user.isAdmin) {
    res.status(404);
    throw new Error("No approved NGO associated with your account.");
  }

  let request;
  if (id && id !== 'token-only') {
    request = await NgoFoodRequest.findById(id);
  } else {
    request = await NgoFoodRequest.findOne({ verificationToken: token.trim().toUpperCase() });
  }

  if (!request) {
    res.status(404);
    throw new Error("NGO food request not found.");
  }

  if (request.status === "fulfilled") {
    res.status(400);
    throw new Error("Request has already been fulfilled.");
  }

  if (!req.user.isAdmin && request.ngoId.toString() !== ngo._id.toString()) {
    res.status(403);
    throw new Error("You are not authorized to verify fulfillment for this request.");
  }

  if (!request.verificationToken || request.verificationToken.toUpperCase() !== token.trim().toUpperCase()) {
    res.status(400);
    throw new Error("Invalid verification token.");
  }

  request.status = "fulfilled";
  request.fulfilledAt = new Date();
  await request.save();

  res.status(200).json({
    message: "Food request successfully verified and marked as completed ✅",
    request
  });
});

const getMyAcceptedFulfillments = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const requests = await NgoFoodRequest.find({ acceptedBy: userId })
    .sort({ updatedAt: -1 })
    .populate("ngoId", "ngoName ngoCity ngoState ngoPhone ngoEmail");

  res.status(200).json({
    requests,
    message: "My fulfillments fetched successfully"
  });
});

export { createNgoFoodRequest, getMyNgoFoodRequests, getNgoStatus, fulfillMyNgoFoodRequest, getActiveNgoFoodRequests, acceptNgoFoodRequest, verifyNgoFoodRequestFulfillment, getMyAcceptedFulfillments };
