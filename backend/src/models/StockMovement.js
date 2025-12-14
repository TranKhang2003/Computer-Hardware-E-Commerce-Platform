const mongoose = require('mongoose');
const { Schema } = mongoose;

const stockMovementSchema = new mongoose.Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    variantId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['in', 'out', 'adjustment', 'return'],
        required: true,
        index: true
    },
    quantity: {
        type: Number,
        required: true
    },
    referenceType: {
        type: String,
        enum: ['order', 'adjustment', 'return', 'manual']
    },
    referenceId: Schema.Types.ObjectId,
    note: String,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'stock_movements'
});

stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ productId: 1, variantId: 1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);