//Stats controller file
import FoodInfo from "../models/foodInfoModel.js";
// user Dashboard
const getUserDashboardStats = async (req, res) => {
  try {
    const {donorId}=req.params;
    // Monthly Donations
    const monthlyDonations = await FoodInfo.aggregate([
      {
        $match: {
          donorId: donorId,
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
          totalValue: { $sum: { $multiply: ["$quantity", "$pricePerUnit"] } }
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Donations by Category
    const donationsByCategory = await FoodInfo.aggregate([
      {
        $match: {
          donorId: donorId
        }
      },
      {
        $group: {
          _id: "$category",
          totalQuantity: { $sum: "$quantity" },
          totalValue: { $sum: { $multiply: ["$quantity", "$pricePerUnit"] } },
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent Donations 5
    const recentDonations = await FoodInfo.find({ donorId: donorId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('recipientId', 'name');

    // Total Donations Summary
    const totalDonations = await FoodInfo.aggregate([
      {
        $match: {
          donorId: donorId
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$quantity" },
          totalValue: { $sum: { $multiply: ["$quantity", "$pricePerUnit"] } },
          totalDonations: { $sum: 1 }
        }
      }
    ]);

    // Tax Exemption Calculation (assuming 30% tax exemption on donated food value)
    const taxExemption = totalDonations[0]?.totalValue * 0.30 || 0;

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