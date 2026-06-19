import FoodInfo from "../models/foodInfoModel.js";
import Ngo from "../models/ngoModel.js";
import mongoose from "mongoose";

const getUserDashboardStats = async (req, res) => {
  try {
    const { donorId } = req.params;
    const donorObjectId = new mongoose.Types.ObjectId(donorId);

    // Monthly Donations
    const monthlyDonations = await FoodInfo.aggregate([
      { $match: { "foodItemDetails.donorId": donorObjectId, createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) } } },
      { $unwind: "$foodItemDetails" },
      { $match: { "foodItemDetails.donorId": donorObjectId } },
      { $group: { _id: { $month: "$createdAt" }, quantity: { $sum: "$foodItemDetails.quantity" }, count: { $sum: 1 }, totalValue: { $sum: { $multiply: ["$foodItemDetails.quantity", 50] } } } },
      { $sort: { _id: 1 } },
    ]);

    // Donations by Category
    const donationsByCategory = await FoodInfo.aggregate([
      { $match: { "foodItemDetails.donorId": donorObjectId } },
      { $unwind: "$foodItemDetails" },
      { $match: { "foodItemDetails.donorId": donorObjectId } },
      { $group: { _id: "$foodItemDetails.category", totalQuantity: { $sum: "$foodItemDetails.quantity" }, totalValue: { $sum: { $multiply: ["$foodItemDetails.quantity", 50] } }, count: { $sum: 1 } } }
    ]);

    // All donations — lean() to avoid populate errors on Mixed ngoPreference field
    const rawDonations = await FoodInfo.find({ "foodItemDetails.donorId": donorObjectId })
      .sort({ createdAt: -1 })
      .populate("pickedUpByNgo")
      .lean();

    // Manually resolve ngoPreference (stored as string ObjectId or 'random')
    const ngoIdSet = new Set();
    for (const d of rawDonations) {
      const ref = d.ngoPreference;
      if (ref && ref !== 'random' && typeof ref === 'string' && /^[a-f\d]{24}$/i.test(ref)) {
        ngoIdSet.add(ref);
      }
    }
    const ngoMap = {};
    if (ngoIdSet.size > 0) {
      const ngos = await Ngo.find({ _id: { $in: [...ngoIdSet] } })
        .select('ngoName ngoEmail ngoPhone ngoCity ngoState ngoAddress isApproved')
        .lean();
      ngos.forEach(n => { ngoMap[n._id.toString()] = n; });
    }
    const recentDonations = rawDonations.map(d => {
      const ref = d.ngoPreference;
      if (ref && typeof ref === 'string' && ngoMap[ref]) {
        d.ngoPreference = ngoMap[ref];
      }
      return d;
    });

    // Total summary
    const totalDonations = await FoodInfo.aggregate([
      { $match: { "foodItemDetails.donorId": donorObjectId } },
      { $unwind: "$foodItemDetails" },
      { $match: { "foodItemDetails.donorId": donorObjectId } },
      { $group: { _id: null, totalQuantity: { $sum: "$foodItemDetails.quantity" }, totalValue: { $sum: { $multiply: ["$foodItemDetails.quantity", 50] } }, totalDonations: { $sum: 1 } } }
    ]);

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
        taxExemption: { eligibleAmount: taxExemption, percentage: "30%" }
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
