import NGO from "../models/ngoModel.js";
import FoodInfo from "../models/foodInfoModel.js";
import User from "../models/userModel.js";

const getStats = async (req, res) => {
  try {
    // NGO Statistics
    const totalNGOs = await NGO.countDocuments();
    const approvedNGOs = await NGO.countDocuments({ isApproved: true });

    // Donor/Donation Statistics
    const totalDonationsCount = await FoodInfo.countDocuments();
    const approvedDonationsCount = await FoodInfo.countDocuments({ isApproved: true });
    const pendingDonationsCount = await FoodInfo.countDocuments({ status: "pending" });

    // User Statistics
    const totalUsersCount = await User.countDocuments();

    // Distinct Cities Count
    const cities = await FoodInfo.distinct("contactDetails.city");
    const citiesCount = cities.length;

    // Top Donors using FoodInfo model (unwind details)
    const topDonors = await FoodInfo.aggregate([
        { $unwind: "$foodItemDetails" },
        {
            $group: {
                _id: "$foodItemDetails.donorId",
                totalDonated: { $sum: "$foodItemDetails.quantity" },
                donationCount: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "donorInfo"
            }
        },
        {
            $project: {
                name: { $concat: [{ $arrayElemAt: ["$donorInfo.firstName", 0] }, " ", { $arrayElemAt: ["$donorInfo.surname", 0] }] },
                totalDonated: 1,
                donationCount: 1
            }
        },
        { $sort: { totalDonated: -1 } },
        { $limit: 5 }
    ]);
    
    // Weekly Donations using FoodInfo
    const weeklyDonations = await FoodInfo.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
            },
        },
        { $unwind: "$foodItemDetails" },
        {
            $group: {
                _id: { $dayOfWeek: "$createdAt" },
                quantity: { $sum: "$foodItemDetails.quantity" },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    
    // Monthly Donations using FoodInfo
    const monthlyDonations = await FoodInfo.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: new Date(new Date().getFullYear(), 0, 1),
                },
            },
        },
        { $unwind: "$foodItemDetails" },
        {
            $group: {
                _id: { $month: "$createdAt" },
                quantity: { $sum: "$foodItemDetails.quantity" },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    
    // Yearly Donations using FoodInfo
    const yearlyDonations = await FoodInfo.aggregate([
        { $unwind: "$foodItemDetails" },
        {
            $group: {
                _id: { $year: "$createdAt" },
                quantity: { $sum: "$foodItemDetails.quantity" },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    // Average Donor Approval Time
    const donorApprovalTimes = await FoodInfo.aggregate([
      {
        $match: {
          isApproved: true,
          approvedAt: { $exists: true },
          createdAt: { $exists: true },
        },
      },
      {
        $project: {
          approvalTime: {
            $divide: [
              { $subtract: ["$approvedAt", "$createdAt"] },
              1000 * 60 * 60,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          averageApprovalTime: { $avg: "$approvalTime" },
          minApprovalTime: { $min: "$approvalTime" },
          maxApprovalTime: { $max: "$approvalTime" },
        },
      },
    ]);

    // Average NGO Approval Time
    const ngoApprovalTimes = await NGO.aggregate([
      {
        $match: {
          isApproved: true,
          approvedAt: { $exists: true },
          createdAt: { $exists: true },
        },
      },
      {
        $project: {
          approvalTime: {
            $divide: [
              { $subtract: ["$approvedAt", "$createdAt"] },
              1000 * 60 * 60,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          averageApprovalTime: { $avg: "$approvalTime" },
          minApprovalTime: { $min: "$approvalTime" },
          maxApprovalTime: { $max: "$approvalTime" },
        },
      },
    ]);

    const totalQtyDonated = await FoodInfo.aggregate([
      { $unwind: "$foodItemDetails" },
      {
        $group: {
          _id: null,
          totalQty: {$sum: "$foodItemDetails.quantity"}
        }
      }
    ]);

    const totalQtyByCategory = await FoodInfo.aggregate([
      { $unwind: "$foodItemDetails" },
      {
        $group: {
          _id: "$foodItemDetails.category",
          totalQty: {$sum: "$foodItemDetails.quantity"}
        }
      }
    ]);

    const totalQty = totalQtyDonated[0]?.totalQty || 0;

    res.status(200).json({
      success: true,
      stats: {
        ngo: {
          total: totalNGOs,
          approved: approvedNGOs,
        },
        donor: {
          total: totalDonationsCount,
          approved: approvedDonationsCount,
          totalQtyDonated: totalQty,
          totalQtyByCategory: totalQtyByCategory,
          topDonors,
        },
        donations: {
          weekly: weeklyDonations,
          monthly: monthlyDonations,
          yearly: yearlyDonations,
        },
        approvalMetrics: {
          donor: {
            averageApprovalTimeHours:
              donorApprovalTimes[0]?.averageApprovalTime || 0,
            minApprovalTimeHours: donorApprovalTimes[0]?.minApprovalTime || 0,
            maxApprovalTimeHours: donorApprovalTimes[0]?.maxApprovalTime || 0,
          },
          ngo: {
            averageApprovalTimeHours:
              ngoApprovalTimes[0]?.averageApprovalTime || 0,
            minApprovalTimeHours: ngoApprovalTimes[0]?.minApprovalTime || 0,
            maxApprovalTimeHours: ngoApprovalTimes[0]?.maxApprovalTime || 0,
          },
        },
      },
      // Flat fields expected by AdminDashboard.jsx
      totalDonations: totalDonationsCount,
      totalUsers: totalUsersCount,
      totalNgos: totalNGOs,
      mealsServed: totalQty,
      approvedDonations: approvedDonationsCount,
      pendingDonations: pendingDonationsCount,
      citiesCount: citiesCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
};

export { getStats };