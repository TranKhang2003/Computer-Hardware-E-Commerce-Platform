const mongoose = require('mongoose');
const { PRODUCT_STATUS } = require('../config/constants');

const productSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    maxlength: 500
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand'
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  costPrice: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: Object.values(PRODUCT_STATUS),
    default: PRODUCT_STATUS.ACTIVE
  },

  // Images
  images: [{
    url: String,
    altText: String,
    displayOrder: Number,
    isPrimary: Boolean
  }],

  // Variants
  variants: [{
    sku: {
      type: String,
      required: true,
      unique: true
    },
    name: String,
    attributes: Map,
    priceAdjustment: {
      type: Number,
      default: 0
    },
    stockQuantity: {
      type: Number,
      required: true,
      default: 0
    },
    lowStockThreshold: {
      type: Number,
      default: 5
    },
    imageUrl: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Flags
  isFeatured: Boolean,
  isNew: Boolean,
  isBestseller: Boolean,

  // Statistics
  viewCount: {
    type: Number,
    default: 0
  },
  soldCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },

  specifications: Map,
  metadata: Map
}, {
  timestamps: true
});

// Indexes
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ brandId: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ basePrice: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ soldCount: -1 });

// Virtual for primary image
productSchema.virtual('primaryImage').get(function () {
  return this.images.find(img => img.isPrimary) || this.images[0];
});

// Methods
productSchema.methods.getVariantById = function (variantId) {
  return this.variants.id(variantId);
};

productSchema.methods.updateStock = async function (variantId, quantity) {
  const variant = this.getVariantById(variantId);
  if (variant) {
    variant.stockQuantity += quantity;
    await this.save();
  }
};

module.exports = mongoose.model('Product', productSchema);
