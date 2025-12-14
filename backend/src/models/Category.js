const mongoose = require('mongoose');
const { Schema } = mongoose;

const categorySchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  description: String,
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  imageUrl: String,
  displayOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
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
  collection: 'categories'
});

categorySchema.index({ slug: 1 });
categorySchema.index({ parentId: 1 });

module.exports = mongoose.model('Category', categorySchema);

