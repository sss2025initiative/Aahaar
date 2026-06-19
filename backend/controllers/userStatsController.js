import FoodInfo from "../models/foodInfoModel.js";
import mongoose from "mongoose";

const getUserDashboardStats = async (req, res) => {
  try {
    const { donorId } = req.params;
    
    // Convert string donorId to Mongoose ObjectId
    const donorObjectId = new mongoose.Types.ObjectId(donorId);

    // Monthly Donations (filtered by donorId inside foodItemDetails)
    const monthlyDonations = await FoodInfo.aggregate([
      {
        $match: {
          "foodItemDetails.donorId": donorObjectId,
          createdAt: {
            $gte: new Date(new Date().getFullYear(), 0, 1),
          },
        },
      },
      { $unwind: "$foodItemDetails" },
      {
        $match: {
          "foodItemDetails.donorId": donorObjectId,
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          quantity: { $sum: "$foodItemDetails.quantity" },
          count: { $sum: 1 },
          totalValue: { $sum: { $multiply: ["$foodItemDetails.quantity", 50] } } // Default price 50 per unit
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Donations by Category
    const donationsByCategory = await FoodInfo.aggregate([
      {
        $match: {
          "foodItemDetails.donorId": donorObjectId
        }
      },
      { $unwind: "$foodItemDetails" },
      {
        $match: {
          "foodItemDetails.donorId": donorObjectId
        }
      },
      {
        $group: {
          _id: "$foodItemDetails.category",
          totalQuantity: { $sum: "$foodItemDetails.quantity" },
          totalValue: { $sum: { $multiply: ["$foodItemDetails.quantity", 50] } },
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent Donations (limit 5)
    const recentDonations = await FoodInfo.find({
      "foodItemDetails.donorId": donorObjectId
    })
      .sort({ createdAt: -1 })
      .populate("ngoPreference")
      .populate("pickedUpByNgo")
      .limit(5);

    // Total Donations Summary
    const totalDonations = await FoodInfo.aggregate([
      {
        $match: {
          "foodItemDetails.donorId": donorObjectId
        }
      },
      { $unwind: "$foodItemDetails" },
      {
        $match: {
          "foodItemDetails.donorId": donorObjectId
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$foodItemDetails.quantity" },
          totalValue: { $sum: { $multiply: ["$foodItemDetails.quantity", 50] } },
          totalDonations: { $sum: 1 }
        }
      }
    ]);

    // Tax Exemption Calculation (assuming 30% tax exemption on donated food value)
    const taxExemption = (totalDonations[0]?.totalValue || 0) * 0.30;

    res.status(200).json({
      success: true,
      data: {
        monthlyDonations,
        donationsByCategory,
        recentDonations,
        totalDonations: {
          totalQuantity: totalDonations[0]?.totalQuantity || 0,
          totalValue: totalDonations[0]?.totalValue || 0,
          totalDonations: totalDonations[0]?.totalDonations || 0
        },
        taxExemption: {
          eligibleAmount: taxExemption,
          percentage: "30%"
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user dashboard statistics",
      error: error.message
    });
  }
};

export { getUserDashboardStats };