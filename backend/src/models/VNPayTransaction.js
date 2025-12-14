const mongoose = require('mongoose');

const vnpayTransactionSchema = new mongoose.Schema({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },

  // VNPay request params
  vnpTxnRef: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  vnpAmount: {
    type: Number,
    required: true
  },
  vnpOrderInfo: {
    type: String,
    required: true
  },
  vnpOrderType: {
    type: String,
    default: 'billpayment'
  },
  vnpLocale: {
    type: String,
    default: 'vn'
  },
  vnpBankCode: String,

  // VNPay response params
  vnpTransactionNo: String,
  vnpResponseCode: String,
  vnpTransactionStatus: String,
  vnpSecureHash: String,
  vnpCardType: String,
  vnpBankTranNo: String,
  vnpPayDate: String,

  // Additional info
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  ipAddress: String,
  responseData: {
    type: Map,
    of: Schema.Types.Mixed
  },
  errorMessage: String,

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
  collection: 'vnpay_transactions'
});

vnpayTransactionSchema.index({ vnpTxnRef: 1 });
vnpayTransactionSchema.index({ orderId: 1 });
vnpayTransactionSchema.index({ status: 1 });


module.exports = mongoose.model('VNPayTransaction', vnpayTransactionSchema);
