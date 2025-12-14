const mongoose = require('mongoose');

const settingSchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  description: String,
  isPublic: {
    type: Boolean,
    default: false
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'settings'
});


module.exports = mongoose.model('Setting', settingSchema);
