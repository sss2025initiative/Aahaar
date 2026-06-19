import asyncHandler from "../middlewares/asyncHandler.js";
import NgoFoodRequest from "../models/ngoFoodRequestModel.js";
import Ngo from "../models/ngoModel.js";
import User from "../models/userModel.js";
import FoodInfo from "../models/foodInfoModel.js";
import { notify } from "../services/notification.service.js";

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

  const request = await NgoFoodRequest.create({
    ngoId: ngo._id,
    requestedBy: userId,
    foodItemsNeeded,
    contactDetails: { contactPersonName, phoneNumber, email, deliveryAddress, city },
    purpose,
    urgencyLevel: urgencyLevel || "medium",
    numberOfBeneficiaries: numberOfBeneficiaries || 0,
    status: "pending",
    verificationToken: token,
  });

  await notify({
      receiverId: userId,
      receiverRole: 'ngo',
      title: 'Food Request Submitted',
      message: 'Your NGO food request has been submitted and broadcast to the community.',
      type: 'FOOD_REQUEST_CREATED',
      entityType: 'NgoFoodRequest',
      entityId: request._id,
      priority: 'medium'
  });

  const totalQty = foodItemsNeeded.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const qtyType = foodItemsNeeded[0]?.quantityType || "Meals";
  const messageText = `NGO ${ngo.ngoName} has requested food assistance. Quantity Needed: ${totalQty} ${qtyType}. Location: ${city}`;

  const allUsers = await User.find({ _id: { $ne: userId } });
  for (const userItem of allUsers) {
      const role = userItem.isAdmin ? 'admin' : 'donor';
      await notify({
          receiverId: userItem._id,
          receiverRole: role,
          title: 'New NGO Food Request',
          message: messageText,
          type: 'FOOD_REQUEST_CREATED',
          entityType: 'NgoFoodRequest',
          entityId: request._id,
          priority: 'medium'
      });
  }

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
    .populate("acceptedBy", "firstName surname email phone");

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

  if (request.requestedBy) {
      await notify({
          receiverId: request.requestedBy,
          receiverRole: 'ngo',
          title: 'Food Request Fulfilled',
          message: 'Your NGO food request has been marked as fulfilled.',
          type: 'FOOD_REQUEST_FULFILLED',
          entityType: 'NgoFoodRequest',
          entityId: request._id,
          priority: 'medium'
      });
  }
  if (request.acceptedBy) {
      await notify({
          receiverId: request.acceptedBy,
          receiverRole: 'donor',
          title: 'Fulfillment Completed',
          message: 'The food request you accepted has been marked as fulfilled.',
          type: 'FOOD_REQUEST_FULFILLED',
          entityType: 'NgoFoodRequest',
          entityId: request._id,
          priority: 'medium'
      });
  }

  res.status(200).json({
    message: "NGO food request marked as completed ✅",
    request,
  });
});

const getActiveNgoFoodRequests = asyncHandler(async (req, res) => {
  const requests = await NgoFoodRequest.find({ status: { $in: ["approved", "pending"] }, acceptedBy: null })
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

  if (request.status !== "approved" && request.status !== "pending") {
    res.status(400);
    throw new Error("Only pending or approved requests can be accepted for donation.");
  }

  if (request.acceptedBy) {
    res.status(400);
    throw new Error("This request has already been accepted by another donor.");
  }

  // Preserve the existing verification token if it was generated during request creation, otherwise generate a new one
  if (!request.verificationToken) {
    const generateUniqueRequestToken = async () => {
      let token;
      let exists = true;
      while (exists) {
        token = Math.floor(100000 + Math.random() * 900000).toString();
        const found = await NgoFoodRequest.findOne({ verificationToken: token });
        if (!found) exists = false;
      }
      return token;
    };
    request.verificationToken = await generateUniqueRequestToken();
  }
  const token = request.verificationToken;

  request.status = "REQUEST_ACCEPTED";
  request.acceptedBy = req.user._id;
  request.acceptedAt = new Date();
  request.expectedDeliveryDate = new Date(expectedDeliveryDate);
  await request.save();
  await request.populate("ngoId", "ngoName ngoCity ngoState ngoPhone ngoEmail");

  // Create a corresponding FoodInfo donation to represent this fulfillment
  // This ensures it appears in the donor's donations list, the NGO's direct donations list, and updates admin stats
  const foodItemDetails = (request.foodItemsNeeded || []).map(item => ({
    foodName: item.foodName,
    quantity: item.quantity,
    quantityType: item.quantityType,
    expiryDate: new Date(expectedDeliveryDate),
    donorId: req.user._id,
    category: item.category
  }));

  const contactDetails = {
    fullAddress: req.user.city + ", " + req.user.state + ", " + req.user.country,
    city: req.user.city || request.contactDetails?.city || "City",
    contactPersonName: `${req.user.firstName} ${req.user.surname}`.trim(),
    phoneNumber: req.user.phone || "N/A",
    email: req.user.email || "N/A"
  };

  let donation = await FoodInfo.findOne({ verificationToken: token });
  if (!donation) {
    await FoodInfo.create({
      foodItemDetails,
      contactDetails,
      ngoPreference: request.ngoId?._id || request.ngoId,
      verificationToken: token,
      status: 'REQUEST_ACCEPTED',
      isApproved: true,
      approvedBy: req.user._id,
      approvedAt: new Date()
    });
  }

  if (request.requestedBy) {
      await notify({
          receiverId: request.requestedBy,
          receiverRole: 'ngo',
          title: 'Food Request Accepted',
          message: `A donor has accepted your food request for "${request.ngoId?.ngoName || 'NGO'}".`,
          type: 'FOOD_REQUEST_ACCEPTED',
          entityType: 'NgoFoodRequest',
          entityId: request._id,
          priority: 'high'
      });
  }

  await notify({
      receiverId: req.user._id,
      receiverRole: 'donor',
      title: 'Fulfillment Scheduled',
      message: `You have accepted the food request. Verification token: ${token}.`,
      type: 'FOOD_REQUEST_ACCEPTED',
      entityType: 'NgoFoodRequest',
      entityId: request._id,
      priority: 'medium'
  });

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

  if (request.status === "fulfilled" || request.status === "COMPLETED") {
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

  request.status = "COMPLETED";
  request.fulfilledAt = new Date();
  await request.save();

  // Mark the corresponding FoodInfo donation as completed
  if (request.verificationToken) {
    const donation = await FoodInfo.findOne({ verificationToken: request.verificationToken.toUpperCase() });
    if (donation && donation.status !== 'done' && donation.status !== 'COMPLETED') {
      donation.status = 'COMPLETED';
      donation.completedAt = new Date();
      if (ngo) {
        donation.pickedUpByNgo = ngo._id;
      }
      await donation.save();
    }
  }

  if (request.requestedBy) {
      await notify({
          receiverId: request.requestedBy,
          receiverRole: 'ngo',
          title: 'Food Request Fulfilled',
          message: 'Your NGO food request fulfillment has been verified and completed.',
          type: 'FOOD_REQUEST_FULFILLED',
          entityType: 'NgoFoodRequest',
          entityId: request._id,
          priority: 'medium'
      });
  }
  if (request.acceptedBy) {
      await notify({
          receiverId: request.acceptedBy,
          receiverRole: 'donor',
          title: 'Fulfillment Completed',
          message: 'Your donation delivery has been verified by the NGO. Thank you!',
          type: 'FOOD_REQUEST_FULFILLED',
          entityType: 'NgoFoodRequest',
          entityId: request._id,
          priority: 'medium'
      });
  }

  // Notify all admins to trigger real-time dashboard updates
  const admins = await User.find({ isAdmin: true });
  for (const admin of admins) {
      await notify({
          receiverId: admin._id,
          receiverRole: 'admin',
          title: 'NGO Request Fulfilled',
          message: `NGO food request #${String(request._id).slice(-10).toUpperCase()} has been successfully fulfilled and completed.`,
          type: 'FOOD_REQUEST_FULFILLED',
          entityType: 'NgoFoodRequest',
          entityId: request._id,
          priority: 'medium'
      });
  }

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
