import asyncHandler from "../middlewares/asyncHandler.js";
import Ngo from "../models/ngoModel.js";
import User from "../models/userModel.js";
import { getFileUrl } from "../s3Config.js";
import { notify } from "../services/notification.service.js";

// @desc    Upload NGO documents
const uploadNgoDocumentsContrller = asyncHandler(async (req, res) => {
  const files = req.files;
  if (files) {
    const filesUrls = {
      certificationOfRegistration: getFileUrl(files.certificationOfRegistration?.[0]),
      ownerPanCard: getFileUrl(files.ownerPanCard?.[0]),
      prevousWorkReport: getFileUrl(files.prevousWorkReport?.[0]),
    };
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

// @desc    Register NGO details   
const ngoDetailsController = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.isVerified) {
    res.status(403);
    throw new Error("Only Aadhaar-verified users can register an NGO");
  }

  const { ngoName, ngoEmail, ngoPhone, ngoAddress, ngoCity, ngoState, ngoPurpose, ngoWebsite, certificationOfRegistration, ownerPanCard, prevousWorkReport, registrationCertificateNumber, panCardNumber } = req.body;

  if (!registrationCertificateNumber || !registrationCertificateNumber.trim()) {
    res.status(400);
    throw new Error("Registration Certificate Number is required");
  }
  if (!panCardNumber || !panCardNumber.trim()) {
    res.status(400);
    throw new Error("Owner / Director PAN Card Number is required");
  }

  const alreadyRegisteredNgo = await Ngo.find({ ngoEmail });
  if (alreadyRegisteredNgo.length > 0) {
    return res.status(400).json({ message: "NGO already registered" });
  }

  // Also check if this user already has an NGO registered
  const userAlreadyHasNgo = await Ngo.findOne({ registeredBy: req.user._id });
  if (userAlreadyHasNgo) {
    return res.status(400).json({ message: "You have already registered an NGO. Please check your NGO Portal." });
  }

  const registeredNgoDetails = await Ngo.create({
    ngoName,
    ngoEmail,
    ngoPhone,
    ngoAddress,
    ngoCity,
    ngoState,
    ngoPurpose,
    ngoWebsite,
    registrationCertificateNumber,
    panCardNumber,
    ngoDocuments: {
      certificationOfRegistration,
      ownerPanCard,
      prevousWorkReport,
    },
    registeredBy: req.user._id,
  });

  if (registeredNgoDetails) {
    // Notify registerer (user)
    await notify({
      receiverId: req.user._id,
      receiverRole: 'ngo',
      title: 'NGO Registration Review',
      message: 'Your NGO registration is under review.',
      type: 'NGO_REGISTERED',
      entityType: 'Ngo',
      entityId: registeredNgoDetails._id,
      priority: 'medium'
    });

    // Notify all Admins
    const admins = await User.find({ isAdmin: true });
    for (const admin of admins) {
      await notify({
        receiverId: admin._id,
        receiverRole: 'admin',
        title: 'New NGO Registration',
        message: 'New NGO registration requires verification.',
        type: 'NEW_NGO_REGISTRATION',
        entityType: 'Ngo',
        entityId: registeredNgoDetails._id,
        priority: 'high'
      });
    }

    return res.status(200).json({ message: "NGO registered successfully", ngoDetails: registeredNgoDetails });
  } else {
    return res.status(400).json({ message: "NGO registration failed" });
  }
});

const getCityRegex = (city) => {
  const trimmed = (city || '').trim();
  if (/^ghazi?a?bad$/i.test(trimmed)) {
    return new RegExp("^ghazi?a?bad$", "i");
  }
  return new RegExp(`^${trimmed}$`, 'i');
};

// @desc    Get NGO details based on city 
const getNgoDetailsBasedOnCity = asyncHandler(async (req, res) => {
  const { ngoCity } = req.params;
  const cityRegex = getCityRegex(ngoCity);
  const ngoDetails = await Ngo.find({
    ngoCity: { $regex: cityRegex },
    isApproved: true
  });
  if (ngoDetails.length > 0) {
    return res.status(200).json({ message: "NGO details found", ngoDetails });
  } else {
    return res.status(200).json({ message: "No NGO details found", ngoDetails: [] });
  }
});

// @desc    Get NGO details by ID
const getNgoByIdController = asyncHandler(async (req, res) => {
  const ngo = await Ngo.findById(req.params.id);
  if (!ngo) {
    res.status(404);
    throw new Error("NGO not found");
  }
  res.status(200).json({ ngo });
});

export { uploadNgoDocumentsContrller, ngoDetailsController, getNgoDetailsBasedOnCity, getNgoByIdController };