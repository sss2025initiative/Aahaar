import mongoose from "mongoose";

const itemizedExemptionSchema = new mongoose.Schema({
    foodName: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    quantityType: {
        type: String,
        required: true
    },
    itemValue: {
        type: Number,
        required: true
    },
    taxRate: {
        type: Number,
        required: true
    },
    exemptionAmount: {
        type: Number,
        required: true
    }
}, { _id: false });

const taxSchema = mongoose.Schema({
    totalExemption: {
        type: Number,
        required: true
    },
    userReceivingTax: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    donationId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref:"FoodInfo"
    },
    donationValue: {
        type: Number,
        required: true
    },
    exemptionDate: {
        type: Date,
        default: Date.now
    },
    taxYear: {
        type: Number,
        required: true
    },
    certificateIssued: {
        type: Boolean,
        default: false
    },
    certificateNumber: {
        type: String
    },
    itemizedExemptions: [itemizedExemptionSchema],
    notes: {
        type: String
    }
}, {
    timestamps: true
});

const Tax = mongoose.model("Tax", taxSchema);

export default Tax;