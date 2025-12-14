const mongoose = require('mongoose');

const notificationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'order_created',
      'order_confirmed',
      'order_shipped',
      'order_delivered',
      'payment_success',
      'payment_failed',
      'review_reply',
      'promotion'
    ],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  link: String,
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  collection: 'notifications'
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });


module.exports = mongoose.model('Notification', notificationSchema);
