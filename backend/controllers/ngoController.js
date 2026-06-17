import asyncHandler from "../middlewares/asyncHandler.js";
import Ngo from "../models/ngoModel.js";
import { getFileUrl } from "../s3Config.js";

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

  const { ngoName, ngoEmail, ngoPhone, ngoAddress, ngoCity, ngoState, ngoPurpose, ngoWebsite, certificationOfRegistration, ownerPanCard, prevousWorkReport } = req.body;

  const alreadyRegisteredNgo = await Ngo.find({ ngoEmail });
  if (alreadyRegisteredNgo.length > 0) {
    return res.status(400).json({ message: "NGO already registered" });
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
    ngoDocuments: {
      certificationOfRegistration,
      ownerPanCard,
      prevousWorkReport,
    },
  });
  if( registeredNgoDetails ){
    return res.status(200).json({ message: "NGO registered successfully", ngoDetails: registeredNgoDetails });
  }
  else {
    return res.status(400).json({ message: "NGO registration failed" });
  }
})

// @desc    Get NGO details based on city 
const getNgoDetailsBasedOnCity = asyncHandler(async (req, res) => {
  const { ngoCity } = req.params;
  const ngoDetails = await Ngo.find({ ngoCity, isApproved: true });
  if (ngoDetails.length > 0) {
    return res.status(200).json({ message: "NGO details found", ngoDetails });
  } else {
    return res.status(200).json({ message: "No NGO details found", ngoDetails: [] });
  }
}
)


export { uploadNgoDocumentsContrller,ngoDetailsController, getNgoDetailsBasedOnCity };