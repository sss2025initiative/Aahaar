import { mongoose } from "mongoose";

const ngoSchema = mongoose.Schema({
    ngoName: {
        type: String,
        required: true,
    },
    ngoEmail: {
        type: String,
        required: true,
    },
    ngoPhone: {
        type: String,
        required: true,
    },
    ngoAddress: {
        type: String,
        required: true,
    },
    ngoCity: {
        type: String,
        required: true,
    },
    ngoState: {
        type: String,
        required: true,
    },
    ngoPurpose: {
        type: String,
        required: true,
    },
    ngoWebsite: {
        type: String,
        required: true,
    },
    ngoDocuments: {
        certificationOfRegistration: {
            type: String,
            required: true,
        },
        ownerPanCard: {
            type: String,
            required: true,
        },
        prevousWorkReport: {
            type: String,
            required: true,
        },

    },
    isApproved: {
        type: Boolean,
        default: false,
    },
},
    { timestamps: true }
);


const Ngo = mongoose.model("Ngo", ngoSchema)
export default Ngo;