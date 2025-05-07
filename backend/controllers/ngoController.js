import asyncHandler from "../middlewares/asyncHandler.js";
import Ngo from "../models/ngoModel.js";

// @desc    Upload NGO documents
const uploadNgoDocumentsContrller = asyncHandler(async (req, res) => {
  const files = req.files;
  if (files) {
    const filesUrls = {
      certificationOfRegistration:files.certificationOfRegistration?.[0]?.location,
      ownerPanCard: files.ownerPanCard?.[0]?.location,
      prevousWorkReport: files.prevousWorkReport?.[0]?.location,
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
  const ngoDetails = await Ngo.find({ ngoCity });
  if (ngoDetails.length > 0) {
    return res.status(200).json({ message: "NGO details found", ngoDetails });
  } else {
    return res.status(400).json({ message: "No NGO details found" });
  }
}
)


export { uploadNgoDocumentsContrller,ngoDetailsController, getNgoDetailsBasedOnCity };