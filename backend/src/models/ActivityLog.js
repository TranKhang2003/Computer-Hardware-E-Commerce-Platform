const mongoose = require('mongoose');
const { Schema } = mongoose;

const adminActivityLogSchema = new Schema({
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  entityType: {
    type: String,
    required: true,
    index: true
  },
  entityId: Schema.Types.ObjectId,
  oldData: {
    type: Map,
    of: Schema.Types.Mixed
  },
  newData: {
    type: Map,
    of: Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  collection: 'admin_activity_logs'
});

adminActivityLogSchema.index({ adminId: 1, createdAt: -1 });
adminActivityLogSchema.index({ entityType: 1, entityId: 1 });



module.exports = mongoose.model('ActivityLog', adminActivityLogSchema);
