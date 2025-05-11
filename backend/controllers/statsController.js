//stats controller
import NGO from "../models/NGO.js";
import FoodInfo from "../models/foodInfoModel.js";

const getStats = async (req, res) => {
  try {
    // NGO Statistics
    const totalNGOs = await NGO.countDocuments();
    const approvedNGOs = await NGO.countDocuments({ isApproved: true });

    // Donor Statistics
    // Update Donor/Donation statistics to use FoodInfo model
    const totalDonors = await FoodInfo.countDocuments();
    const approvedDonors = await FoodInfo.countDocuments({ isApproved: true });
    
    // Top Donors using FoodInfo model
    const topDonors = await FoodInfo.aggregate([
        {
            $group: {
                _id: "$donorId",
                totalDonated: { $sum: "$quantity" },
                donationCount: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: "users",  // Assuming donor info is in users collection
                localField: "_id",
                foreignField: "_id",
                as: "donorInfo"
            }
        },
        {
            $project: {
                name: { $arrayElemAt: ["$donorInfo.name", 0] },
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
        {
            $group: {
                _id: { $dayOfWeek: "$createdAt" },
                quantity: { $sum: "$quantity" },
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
        {
            $group: {
                _id: { $month: "$createdAt" },
                quantity: { $sum: "$quantity" },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    
    // Yearly Donations using FoodInfo
    const yearlyDonations = await FoodInfo.aggregate([
        {
            $group: {
                _id: { $year: "$createdAt" },
                quantity: { $sum: "$quantity" },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    // Average Donor Approval Time
    const donorApprovalTimes = await Donor.aggregate([
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
      {
        $group: {
          _id: null,
          totalQty: {$sum: "$quantity"}
        }
      }
    ]) 

    const totalQtyByCategory = await FoodInfo.aggregate([{
      $group: {
        _id: "$category",
        totalQty: {$sum: "$quantity"}
      }
    }])

    res.status(200).json({
      success: true,
      stats: {
        ngo: {
          total: totalNGOs,
          approved: approvedNGOs,
          // Remove pending: pendingNGOs since it's not defined
        },
        donor: {
          total: totalDonors,
          approved: approvedDonors,
          totalQtyDonated: totalQtyDonated[0]?.totalQty || 0,
          totalQtyByCategory: totalQtyByCategory,
          // Remove pending: pendingDonors since it's not defined
          topDonors,
        },
        donations: {
          weekly: weeklyDonations,
          monthly: monthlyDonations,
          yearly: yearlyDonations,
          // Remove categoryDistribution since it's not defined
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