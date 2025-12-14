const mongoose = require('mongoose');
const { Schema } = mongoose;


const discountCodeSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 5,
    index: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed_amount'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxDiscountAmount: {
    type: Number,
    min: 0
  },
  usageLimit: {
    type: Number,
    default: 10,
    min: 1
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },

  usedBy: [
    {
      user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
      usedAt: { type: Date, default: Date.now }
    }
  ],

  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true,
});

discountCodeSchema.index({ code: 1 });
discountCodeSchema.index({ isActive: 1 });


module.exports = mongoose.model('DiscountCode', discountCodeSchema);
