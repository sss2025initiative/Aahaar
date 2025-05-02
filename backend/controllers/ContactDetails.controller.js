import ContactDetails from "../models/ContactDetails";
import asyncHandler from "../middlewares/asyncHandler.js";

const creatContactDetails=asyncHandler(async(req,res)=>{
    const {PickupAddress,ContactPerson,ContactNumber,EmailAddress}=requestAnimationFrame.body;
    const ContactDetail=await ContactDetails.create({
        PickupAddress,
        ContactPerson,
        ContactNumber,
        EmailAddress
    })
    return res.status(200).json({
        message:"ContactDetails created Successfully",
        ContactDetail
    })
})

const getContactDetails=asyncHandler(async(req,res)=>{
    const ContactDetail=await ContactDetails.find();
    if(!ContactDetail){
        return res.status(400).json({
            message:"ContactDetails not found"
        });
    }
    return res.status(200).json({
        message:"ContactDetails fetched Successfully",
        ContactDetail
    })
})

const updateContactDetails=asyncHandler(async(req,res)=>{
   const ContactDetail=await ContactDetails.findById(req.params.id);
   if(!ContactDetail){
    return res.status(400).json({
        message:"ContactDetails not found"
    });
   }
   const updatedContactDetail=await ContactDetails.findByIdAndUpdate(req.params.id,req.body,{new:true});
   return res.status(200).json({
       message:"ContactDetails updated Successfully",
       updatedContactDetail
   })
})

const deleteContactDetails=asyncHandler(async(req,res)=>{
    const ContactDetail=await ContactDetails.findByIdAndDelete(req.params.id);
    await ContactDetail.remove();
    return res.status(200).json({
        message:"Contact Details Delete SucessFully",

    })
})
export {creatContactDetails,getContactDetails,updateContactDetails,deleteContactDetails};