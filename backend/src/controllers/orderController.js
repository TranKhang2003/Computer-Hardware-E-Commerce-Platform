const Order = require('../models/Order');
const Product = require('../models/Product');
const DiscountCode = require('../models/DiscountCode');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');

class OrderController {

  async createOrder(req, res, next) {
    try {
      const userId = req.user?.id;
      const {
        items,
        shippingAddress,
        customerName,
        customerEmail,
        customerPhone,
        paymentMethod = 'cod',
        discountCode,
        loyaltyPointsUsed = 0,
        note
      } = req.body;

      // Validate required fields
      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Order must contain at least one item'
        });
      }

      if (!customerName || !customerEmail || !customerPhone) {
        return res.status(400).json({
          success: false,
          message: 'Customer information is required'
        });
      }

      const existsEmail = await User.exists({ email: customerEmail });

      if (existsEmail && !userId) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered.'
        });
      }


      if (!shippingAddress?.addressLine1 || !shippingAddress?.ward ||
        !shippingAddress?.district || !shippingAddress?.city) {
        return res.status(400).json({
          success: false,
          message: 'Complete shipping address is required'
        });
      }

      // Get all products with variants in one query
      const productIds = items.map(item => item.productId);
      const products = await Product.find({ _id: { $in: productIds } })
        .select('name slug basePrice discount images variants specifications');


      if (products.length === 0) {
        throw new Error('Some products not found');
      }

      // Create product map for quick lookup
      const productMap = new Map(products.map(p => [p._id.toString(), p]));

      // Validate and calculate order items
      const orderItems = [];
      let subtotal = 0;

      for (const item of items) {
        const product = productMap.get(item.productId.toString());

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        // Check stock - FIX: Use stockQuantity instead of stock
        if (item.variantId) {
          const variant = product.variants.id(item.variantId);
          if (!variant) {
            throw new Error(`Variant ${item.variantId} not found`);
          }
          if (!variant.isActive) {
            throw new Error(`Variant ${variant.name} is not available`);
          }
          if (variant.stockQuantity < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name} - ${variant.name}`);
          }
        } else {
          // For products without variants, check total stock from all variants or specifications
          const totalStock = product.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
          if (totalStock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
        }

        // Calculate price
        let unitPrice;
        let variantName = null;
        let sku = null;

        if (item.variantId) {
          const variant = product.variants.id(item.variantId);
          unitPrice = (product.basePrice + (variant.priceAdjustment || 0)) * (1 - (product.discount || 0) / 100);
          variantName = variant.name;
          sku = variant.sku;
        } else {
          unitPrice = product.basePrice * (1 - (product.discount || 0) / 100);
          sku = product.sku;
        }

        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;

        orderItems.push({
          productId: product._id,
          variantId: item.variantId || null,
          productName: product.name,
          variantName,
          sku,
          quantity: item.quantity,
          unitPrice,
          unitCost: product.costPrice || product.basePrice * 0.6, // Use costPrice if available
          totalPrice,
          imageUrl: product.images?.[0]?.url || ''
        });
      }

      // Calculate shipping fee
      const SHIPPING_THRESHOLD = 5000000;
      const SHIPPING_FEE = 25000;
      const shippingFee = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

      // Calculate tax (10%)
      const TAX_RATE = 0.1;
      const taxAmount = subtotal * TAX_RATE;

      // Handle discount code
      let discountAmount = 0;
      let discountCodeDoc = null;

      if (discountCode) {
        discountCodeDoc = await DiscountCode.findOne({
          code: discountCode.toUpperCase(),
          isActive: true
        });

        if (!discountCodeDoc) {
          throw new Error('Invalid or inactive discount code');
        }

        if (discountCodeDoc.usedCount >= discountCodeDoc.usageLimit) {
          throw new Error('Discount code usage limit exceeded');
        }

        if (subtotal < discountCodeDoc.minOrderAmount) {
          throw new Error(`Minimum order amount of ${(discountCodeDoc.minOrderAmount).toLocaleString('vi-VN')} ₫ required`);
        }

        // Check if user already used this code
        if (userId && discountCodeDoc.usedBy.some(u => u.user.toString() === userId)) {
          throw new Error('You have already used this discount code');
        }

        // Calculate discount
        if (discountCodeDoc.discountType === 'percentage') {
          discountAmount = (subtotal * discountCodeDoc.discountValue) / 100;
          if (discountCodeDoc.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, discountCodeDoc.maxDiscountAmount);
          }
        } else {
          discountAmount = discountCodeDoc.discountValue;
        }
      }

      // Handle loyalty points
      let loyaltyDiscount = 0;
      if (userId && loyaltyPointsUsed > 0) {
        const user = await User.findById(userId);

        if (!user) {
          throw new Error('User not found');
        }

        if (user.loyaltyPoints < loyaltyPointsUsed) {
          throw new Error('Insufficient loyalty points');
        }

        // 1 point = 1000 VND
        loyaltyDiscount = loyaltyPointsUsed * 1000;

        // Update user points
        user.loyaltyPoints -= loyaltyPointsUsed;
        await user.save();
      }

      // Calculate total
      const totalAmount = subtotal + shippingFee + taxAmount - discountAmount - loyaltyDiscount;
      // const pointsEarned = Math.floor(totalAmount / 1000);
      const pointsEarned = Math.floor(totalAmount * 0.0001);

      // Generate order number
      const orderNumber = await Order.generateOrderNumber();



      // Create order
      const order = await Order.create({
        orderNumber,
        userId: userId || null,
        customerEmail,
        customerName,
        customerPhone,
        shippingAddress,
        items: orderItems,
        subtotal,
        discountAmount,
        loyaltyPointsUsed,
        loyaltyDiscount,
        shippingFee,
        pointsEarned,
        taxAmount,
        totalAmount,
        discountCodeId: discountCodeDoc?._id,
        discountCode: discountCodeDoc?.code,
        paymentMethod,
        note,
        status: 'pending_payment'
      });

      if (order.userId) {
        const user = await User.findById(order.userId);
        if (user) {
          user.loyaltyPoints += pointsEarned;
          user.totalSpent += order.totalAmount;
          await user.save();
        }
      }

      // Update discount code usage
      if (discountCodeDoc) {
        discountCodeDoc.usedCount += 1;
        if (userId) {
          discountCodeDoc.usedBy.push({
            user: userId,
            order: order._id,
            usedAt: new Date()
          });
        }
        await discountCodeDoc.save();
      }

      // Update product stock - FIX: Use stockQuantity instead of stock
      for (const item of orderItems) {
        const product = await Product.findById(item.productId);

        if (item.variantId) {
          const variant = product.variants.id(item.variantId);
          variant.stockQuantity -= item.quantity;
        } else {
          // If no variant specified, reduce from first available variant
          const firstVariant = product.variants.find(v => v.isActive && v.stockQuantity >= item.quantity);
          if (firstVariant) {
            firstVariant.stockQuantity -= item.quantity;
          }
        }

        // Update sold count
        product.soldCount = (product.soldCount || 0) + item.quantity;

        await product.save();
      }



      if (paymentMethod === 'cod') {
        await sendEmail({
          to: order.customerEmail,
          template: 'ORDER_SUCCESS',
          data: {
            fullName: order.customerName,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount
          }
        });
      }

      // Check payment method and return appropriate response
      if (paymentMethod === 'vnpay') {
        return res.status(201).json({
          success: true,
          message: 'Order created successfully',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            paymentMethod: 'vnpay',
            requiresPayment: true
          }
        });
      } else {
        // COD - normal flow
        return res.status(201).json({
          success: true,
          message: 'Order created successfully',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount
          }
        });
      }

    } catch (error) {
      next(error);
    }
  }

  // Customer: Get own orders
  async getMyOrders(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      const filter = { userId };
      if (status && status !== 'all') {
        filter.status = status;
      }

      const skip = (page - 1) * limit;

      const orders = await Order.find(filter)
        .populate('items.productId', 'name images slug')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(skip)
        .lean();

      const total = await Order.countDocuments(filter);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Customer: Get order details
  async getOrderById(req, res, next) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      const order = await Order.findById(orderId)
        .populate('items.productId', 'name images slug')
        .populate('discountCodeId', 'code discountType discountValue')
        .lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if user owns this order (unless admin) - Allow guest orders
      if (userId && order.userId && order.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  }

  // Customer: Cancel order
  async cancelOrder(req, res, next) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      const { reason } = req.body;

      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check ownership
      if (order.userId && order.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Can only cancel pending or confirmed orders
      if (!['pending_payment', 'confirmed'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel order at this stage'
        });
      }

      // Restore product stock - FIX: Use stockQuantity instead of stock
      for (const item of order.items) {
        const product = await Product.findById(item.productId);

        if (item.variantId) {
          const variant = product.variants.id(item.variantId);
          variant.stockQuantity += item.quantity;
        } else {
          const firstVariant = product.variants[0];
          if (firstVariant) {
            firstVariant.stockQuantity += item.quantity;
          }
        }

        // Update sold count
        product.soldCount = Math.max(0, (product.soldCount || 0) - item.quantity);

        await product.save();
      }

      // Refund loyalty points
      if (order.loyaltyPointsUsed > 0 && order.userId) {
        const user = await User.findById(order.userId);
        if (user) {
          user.loyaltyPoints += order.loyaltyPointsUsed;
          await user.save();
        }
      }

      if (order.pointsEarned > 0 && order.userId) {
        const user = await User.findById(order.userId);
        if (user && user.loyaltyPoints >= order.pointsEarned) {
          user.loyaltyPoints -= order.pointsEarned;
          await user.save();
        }
      }

      // Update order
      order.status = 'cancelled';
      order.cancelledAt = new Date();
      order.statusHistory.push({
        status: 'cancelled',
        note: reason || 'Cancelled by customer',
        createdBy: userId,
        createdAt: new Date()
      });
      await order.save();

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: order
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get all orders
  async getAllOrders(req, res, next) {
    try {
      const { page = 1, limit = 20, status, dateRange, search } = req.query;

      const filter = {};

      if (status && status !== 'all') {
        filter.status = status;
      }

      if (dateRange && dateRange !== 'all') {
        const now = new Date();
        const startDate = new Date();

        switch (dateRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'yesterday':
            startDate.setDate(now.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        }

        filter.createdAt = { $gte: startDate };
      }

      if (search) {
        filter.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { customerName: { $regex: search, $options: 'i' } },
          { customerEmail: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      const orders = await Order.find(filter)
        .populate('userId', 'fullName email')
        .populate('items.productId', 'name images')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(skip)
        .lean();

      const total = await Order.countDocuments(filter);

      // Calculate stats
      const stats = await Order.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalProfit: {
              $sum: {
                $subtract: [
                  '$totalAmount',
                  { $sum: '$items.unitCost' }
                ]
              }
            }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / limit)
          },
          stats: stats[0] || { totalRevenue: 0, totalProfit: 0 }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update order status
  async updateOrderStatus(req, res, next) {
    try {
      const { orderId } = req.params;
      const { status, note } = req.body;

      const validStatuses = ['pending_payment', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const oldStatus = order.status;
      order.status = status;

      // Update timestamps
      if (status === 'confirmed') order.confirmedAt = new Date();
      if (status === 'shipping') order.shippedAt = new Date();
      if (status === 'delivered') {
        order.deliveredAt = new Date();
        order.paymentStatus = 'paid';
        order.paidAt = new Date();
      }

      if (status === 'cancelled' && oldStatus !== 'cancelled') {
        const userId = req.user.id;
        const reason = note || 'Cancelled by admin';

        // Khôi phục stock
        for (const item of order.items) {
          const product = await Product.findById(item.productId);
          if (!product) continue;

          if (item.variantId) {
            const variant = product.variants.id(item.variantId);
            if (variant) variant.stockQuantity += item.quantity;
          } else {
            const firstVariant = product.variants[0];
            if (firstVariant) firstVariant.stockQuantity += item.quantity;
          }

          product.soldCount = Math.max(0, (product.soldCount || 0) - item.quantity);
          await product.save();
        }

        // Refund loyalty points
        if (order.loyaltyPointsUsed > 0 && order.userId) {
          const user = await User.findById(order.userId);
          if (user) {
            user.loyaltyPoints += order.loyaltyPointsUsed;
            await user.save();
          }
        }

        if (order.pointsEarned > 0 && order.userId) {
          const user = await User.findById(order.userId);
          if (user && user.loyaltyPoints >= order.pointsEarned) {
            user.loyaltyPoints -= order.pointsEarned;
            await user.save();
          }
        }

        // Update order
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.statusHistory.push({
          status: 'cancelled',
          note: reason,
          createdBy: userId,
          createdAt: new Date()
        });
      }

      order.statusHistory.push({
        status,
        note: note || `Status changed from ${oldStatus} to ${status}`,
        createdBy: req.user.id,
        createdAt: new Date()
      });

      await order.save();

      res.json({
        success: true,
        data: order,
        message: 'Order status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Validate discount code
  async validateDiscountCode(req, res, next) {
    try {
      const { code, subtotal } = req.body;
      const userId = req.user?.id;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Discount code is required'
        });
      }

      const discountCode = await DiscountCode.findOne({
        code: code.toUpperCase(),
        isActive: true
      });

      if (!discountCode) {
        return res.status(404).json({
          success: false,
          message: 'Invalid or inactive discount code'
        });
      }

      if (discountCode.usedCount >= discountCode.usageLimit) {
        return res.status(400).json({
          success: false,
          message: 'Discount code usage limit exceeded'
        });
      }

      if (subtotal < discountCode.minOrderAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum order amount of $${discountCode.minOrderAmount} required`
        });
      }

      // Check if user already used this code
      if (userId && discountCode.usedBy.some(u => u.user.toString() === userId)) {
        return res.status(400).json({
          success: false,
          message: 'You have already used this discount code'
        });
      }

      // Calculate discount
      let discountAmount = 0;
      if (discountCode.discountType === 'percentage') {
        discountAmount = (subtotal * discountCode.discountValue) / 100;
        if (discountCode.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, discountCode.maxDiscountAmount);
        }
      } else {
        discountAmount = discountCode.discountValue;
      }

      res.json({
        success: true,
        data: {
          code: discountCode.code,
          discountType: discountCode.discountType,
          discountValue: discountCode.discountValue,
          discountAmount,
          message: `Discount of ${(discountAmount).toLocaleString('vi-VN')} ₫ applied!`
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async trackGuestOrder(req, res, next) {
    try {
      const { orderNumber, email } = req.body;

      if (!orderNumber || !email) {
        return res.status(400).json({
          success: false,
          message: 'Order number and email are required'
        });
      }

      const order = await Order.findOne({
        orderNumber: orderNumber.toUpperCase(),
        customerEmail: email.toLowerCase()
      })
        .populate('items.productId', 'name images slug')
        .populate('discountCodeId', 'code discountType discountValue')
        .lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found. Please check your order number and email.'
        });
      }

      // Remove sensitive info for guest users
      const sanitizedOrder = {
        ...order,
        userId: undefined,
        internalNote: undefined
      };

      res.json({
        success: true,
        data: sanitizedOrder
      });
    } catch (error) {
      next(error);
    }
  }

}

module.exports = new OrderController();