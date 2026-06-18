import mongoose from "mongoose";

const ngoFoodRequestSchema = new mongoose.Schema(
  {
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ngo",
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // What the NGO needs
    foodItemsNeeded: [
      {
        foodName: { type: String, required: true },
        quantity: { type: Number, required: true },
        quantityType: {
          type: String,
          enum: ["kg", "g", "ml", "l", "pcs"],
          required: true,
        },
        category: {
          type: String,
          enum: [
            "Fruits",
            "Vegetables",
            "Bakery",
            "Dairy",
            "Cooked Meals",
            "Beverages",
            "Packaged Food",
            "Grains",
            "Others",
          ],
          required: true,
        },
      },
    ],
    // Pickup / delivery contact
    contactDetails: {
      contactPersonName: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      email: { type: String, required: true },
      deliveryAddress: { type: String, required: true },
      city: { type: String, required: true },
    },
    purpose: { type: String, required: true }, // why they need this food
    urgencyLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    numberOfBeneficiaries: { type: Number, default: 0 },
    // Status lifecycle
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "fulfilled"],
      default: "pending",
    },
    adminInReview: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectedReason: { type: String },
    fulfilledAt: { type: Date },
    adminNotes: { type: String },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    acceptedAt: { type: Date },
    expectedDeliveryDate: { type: Date },
    verificationToken: { type: String },
  },
  { timestamps: true }
);

const NgoFoodRequest = mongoose.model("NgoFoodRequest", ngoFoodRequestSchema);
export default NgoFoodRequest;
