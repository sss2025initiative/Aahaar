import mongoose from "mongoose";

const contactDetailsSchema = new mongoose.Schema({
  fullAddress: { type: String, required: true },
  city: { type: String, required: true },
  contactPersonName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
}, { _id: false });
const foodInfoSchema = new mongoose.Schema({
  foodItemDetails:[{foodName: { type: String, required: true },
  quantity: { type: Number },
  quantityType: { type: String, enum: ['kg', 'g', 'ml', 'l', 'pcs'] },
  expiryDate: { type: Date, required: true },
  packaging: { type: String },
  imageUrl: { type: [String]},
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: {
    type: String,
    enum: ['Fruits', 'Vegetables', 'Bakery', 'Dairy', 'Cooked Meals', 'Beverages', 'Packaged Food', 'Grains', 'Others'],
    required: true
  }}],
  contactDetails: { type: contactDetailsSchema, required: true },
  ngoPreference: { type: mongoose.Schema.Types.ObjectId, ref: 'Ngo', default: "random" },
  adminInReview:{type:Boolean,default:false}, 
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  isApproved:{type:Boolean,default:false},
  approvedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},
  approvedAt:{type:Date},
  rejectedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},
  rejectedAt:{type:Date},
  rejectedReason:{type:String},
},{ timestamps: true });

const FoodInfo = mongoose.model('FoodInfo', foodInfoSchema);

export default FoodInfo;
