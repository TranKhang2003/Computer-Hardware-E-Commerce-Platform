const mongoose = require('mongoose');
const { Schema } = mongoose;

const productCommentSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'ProductComment',
    sparse: true,
    index: true
  },
  authorName: {
    type: String,
    required: true
  },
  authorEmail: String,
  comment: {
    type: String,
    required: true
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  ipAddress: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'product_comments'
});

productCommentSchema.index({ productId: 1, createdAt: -1 });
productCommentSchema.index({ parentId: 1 });


module.exports = mongoose.model('Comment', productCommentSchema);
