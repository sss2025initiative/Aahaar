import asyncHandler from "../middlewares/asyncHandler";
import FoodInfo from "../models/foodInfoModel.js";
import Tax from "../models/taxModel.js";

const calculateTaxForExemption = asyncHandler(async (req, res) => {
    const foodRates = {
        'Fruits': 0.35,
        'Vegetables': 0.35,
        'Bakery': 0.25,
        'Dairy': 0.30,
        'Cooked Meals': 0.40,
        'Beverages': 0.20,
        'Packaged Food': 0.25,
        'Grains': 0.30,
        'Others': 0.15
    }

    const categoryBaseValues = {
        'Fruits': 50,      
        'Vegetables': 40,  
        'Bakery': 60,      
        'Dairy': 70,       
        'Cooked Meals': 80, 
        'Beverages': 30,    
        'Packaged Food': 65, 
        'Grains': 45,       
        'Others': 35      
    };
    
    // Get donation ID from params
    const { donationId } = req.params;
    
    // Find the donation
    const donation = await FoodInfo.findById(donationId);
    if (!donation) {
        return res.status(404).json({
            message: "Donation not found"
        });
    }
    
    // Check if donation is approved
    if (!donation.isApproved) {
        return res.status(403).json({ 
            success: false,
            message: "Donation is not approved yet" 
        });
    }
    
    const existingTax = await Tax.findOne({
        donationId: donationId
    });
    
    if (existingTax) {
        return res.status(200).json({
            success: true,
            message: "Tax already calculated for this donation",
            taxExemption: existingTax
        });
    }
    
    const currentDate = new Date();
    const taxYear = currentDate.getMonth() >= 3 ? currentDate.getFullYear() : currentDate.getFullYear() - 1;
    
    let totalExemptionAmount = 0;
    let totalDonationValue = 0;
    const itemizedExemptions = [];
    
    for (const foodItem of donation.foodItems) {
        const taxRate = foodRates[foodItem.category] || 0.15; 
        
        const baseValue = categoryBaseValues[foodItem.category] || 35;
        
        let itemValue = baseValue * foodItem.quantity;
        
        if (foodItem.quantityType === 'g') {
            itemValue = itemValue * 0.001; // Convert g to kg
        } else if (foodItem.quantityType === 'ml') {
            itemValue = itemValue * 0.001; // Convert ml to l
        }
        
        const itemExemption = itemValue * taxRate;
        
        totalDonationValue += itemValue;
        totalExemptionAmount += itemExemption;
        
        itemizedExemptions.push({
            foodName: foodItem.foodName,
            category: foodItem.category,
            quantity: foodItem.quantity,
            quantityType: foodItem.quantityType,
            itemValue: Math.round(itemValue * 100) / 100,
            taxRate: taxRate,
            exemptionAmount: Math.round(itemExemption * 100) / 100
        });
    }
    
    totalDonationValue = Math.round(totalDonationValue * 100) / 100;
    totalExemptionAmount = Math.round(totalExemptionAmount * 100) / 100;
    
    const taxExemption = await Tax.create({
        totalExemption: totalExemptionAmount,
        userReceivingTax: donation.donorId,
        donationId: donation._id,
        donationValue: totalDonationValue,
        exemptionDate: currentDate,
        taxYear: taxYear,
        certificateIssued: false,
        itemizedExemptions: itemizedExemptions
    });
    
    res.status(201).json({
        success: true,
        message: "Tax exemption calculated successfully",
        taxExemption
    });
});

export { calculateTaxForExemption };