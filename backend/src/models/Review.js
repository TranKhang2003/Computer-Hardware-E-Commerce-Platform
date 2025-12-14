// Review.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const productReviewSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true, // ✅ Thêm required
    index: true
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    default: null // ✅ Cho phép null
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    maxlength: 200
  },
  comment: {
    type: String,
    maxlength: 2000
  },
  images: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
    index: true
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  helpful: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'product_reviews'
});

// ✅ Indexes
productReviewSchema.index({ productId: 1, createdAt: -1 });
productReviewSchema.index({ userId: 1 });
productReviewSchema.index({ rating: 1 });

// ✅ FIX: One review per user per product (không cần orderId)
productReviewSchema.index(
  { productId: 1, userId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Review', productReviewSchema);