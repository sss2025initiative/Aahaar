import mongoose from "mongoose";
const FoodInfoSchema = new mongoose.Schema({
    foodName:{
        type:String,
        required:true
    },
    Category:{
        type :["Baked Goods","Produce","Prepared Foods","Dairy","Fruits","Vegetables","Grains","Other"],        
        required:true
    },
    quantity:{
        type:Number,
        required:true
    },
    unit:{
        type:["Kilograms","Units","Trays","Boxes","Packets"],
        required:true
    },
    expiryDate:{
        type:Date,
        required:true
    },
    Description:{
        type:String,
    },

},{timestamps:true});

const FoodInfo = mongoose.model("FoodInfo", FoodInfoSchema);

export default FoodInfo;