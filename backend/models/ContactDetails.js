import mongoose, { Types } from "mongoose";

const ContactDetails=mongoose.Schema({
    PickupAddress:{
        Type:"String",
        required:true
    },
    ContactPerson:{
        Type:"String",
        required:true
    },
    ContactNumber:{
        Type:"String",
        required:true
    },
    EmailAddress:{
        Type:"String",
        required:true
    },
},{timestamps:true})
const ContactDetail = mongoose.model("ContactDetails", ContactDetails);

export default ContactDetails;