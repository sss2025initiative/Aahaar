import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    receiverRole: {
      type: String,
      enum: ['donor', 'ngo', 'admin', 'volunteer'],
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      index: true
    },
    entityType: {
      type: String,
      enum: ['Donation', 'FoodInfo', 'NgoRequest', 'NgoFoodRequest', 'User', 'Ngo', 'TaxCertificate', 'System'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    status: {
      type: String,
      default: 'unread'
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date
    },
    metadata: {
      type: Map,
      of: String
    }
  },
  {
    timestamps: true
  }
);

// Compound index for sorting notifications by date for a specific user
notificationSchema.index({ receiverId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
