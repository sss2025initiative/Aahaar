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

export { createNgoFoodRequest, getMyNgoFoodRequests, getNgoStatus, fulfillMyNgoFoodRequest };
