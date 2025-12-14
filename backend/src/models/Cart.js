const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  cartId: { type: String, sparse: true },

  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    priceAtAdd: Number,
    productName: String,
    variantName: String,
    imageUrl: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  expiresAt: Date
}, {
  timestamps: true
});

// Indexes
cartSchema.index({ userId: 1 });
cartSchema.index({ cartId: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Methods
cartSchema.methods.calculateSubtotal = function () {
  return this.items.reduce((total, item) => {
    return total + (item.priceAtAdd * item.quantity);
  }, 0);
};

cartSchema.methods.addItem = function (item) {
  const existingItem = this.items.find(i =>
    i.variantId.toString() === item.variantId.toString()
  );

  if (existingItem) {
    existingItem.quantity += item.quantity;
  } else {
    this.items.push(item);
  }
};

cartSchema.methods.updateItemQuantity = function (variantId, quantity) {
  const item = this.items.find(i =>
    i.variantId.toString() === variantId.toString()
  );

  if (item) {
    if (quantity <= 0) {
      this.items = this.items.filter(i =>
        i.variantId.toString() !== variantId.toString()
      );
    } else {
      item.quantity = quantity;
    }
  }
};

cartSchema.methods.removeItem = function (variantId) {
  this.items = this.items.filter(i =>
    i.variantId.toString() !== variantId.toString()
  );
};

cartSchema.methods.clear = function () {
  this.items = [];
};

module.exports = mongoose.model('Cart', cartSchema);