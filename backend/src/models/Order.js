const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } = require('../config/constants');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Customer info
  customerEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },

  // Shipping address
  shippingAddress: {
    addressLine1: String,
    addressLine2: String,
    ward: String,
    district: String,
    city: String,
    postalCode: String
  },

  // Order items
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    variantId: mongoose.Schema.Types.ObjectId,
    productName: String,
    variantName: String,
    sku: String,
    quantity: Number,
    unitPrice: Number,
    unitCost: Number,
    totalPrice: Number,
    imageUrl: String
  }],

  // Amounts
  subtotal: Number,
  discountAmount: {
    type: Number,
    default: 0
  },
  loyaltyPointsUsed: {
    type: Number,
    default: 0
  },
  loyaltyDiscount: {
    type: Number,
    default: 0
  },
  shippingFee: Number,
  taxAmount: Number,
  totalAmount: Number,

  // Discount
  discountCodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DiscountCode'
  },
  discountCode: String,

  // Status
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.PENDING_PAYMENT
  },

  // Status history
  statusHistory: [{
    status: String,
    note: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Payment
  paymentMethod: {
    type: String,
    enum: Object.values(PAYMENT_METHOD),
    required: true
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING
  },

  paymentInfo: {
    transactionNo: String,
    bankCode: String,
    payDate: Date,
    responseCode: String,
    completedAt: Date,
    failedAt: Date,
    additionalInfo: mongoose.Schema.Types.Mixed
  },

  pointsEarned: {
    type: Number,
    default: 0
  },

  note: String,
  internalNote: String,

  // Timestamps
  paidAt: Date,
  confirmedAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

// Middleware
orderSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      note: 'Status updated',
      createdAt: new Date()
    });
  }
  next();
});

// Methods
orderSchema.methods.calculateProfit = function () {
  return this.items.reduce((total, item) => {
    const profit = (item.unitPrice - (item.unitCost || item.unitPrice)) * item.quantity;
    return total + profit;
  }, 0);
};

// Static method to generate order number
orderSchema.statics.generateOrderNumber = async function () {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ORD-${dateStr}-`;

  const lastOrder = await this.findOne({
    orderNumber: new RegExp(`^${prefix}`)
  }).sort({ createdAt: -1 });

  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(3, '0')}`;
};

module.exports = mongoose.model('Order', orderSchema);
