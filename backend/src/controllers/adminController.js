const tokenBlacklist = require('../services/tokenBlacklist.service');
const RefreshToken = require('../models/RefreshToken');
const redisClient = require('../config/redis');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const DiscountCode = require('../models/DiscountCode');

class AdminController {
  constructor() {
    this.getBlacklistStats = this.getBlacklistStats.bind(this);
    this.clearBlacklist = this.clearBlacklist.bind(this);
    this.getTokenInfo = this.getTokenInfo.bind(this);
    this.revokeUserTokens = this.revokeUserTokens.bind(this);
    this.getSystemHealth = this.getSystemHealth.bind(this);
  }

  // Get blacklist statistics
  async getBlacklistStats(req, res, next) {
    try {
      const stats = await tokenBlacklist.getStats();

      // Get refresh token stats
      const totalRefreshTokens = await RefreshToken.countDocuments();
      const activeRefreshTokens = await RefreshToken.countDocuments({
        revoked: false,
        expiresAt: { $gt: new Date() }
      });
      const revokedRefreshTokens = await RefreshToken.countDocuments({ revoked: true });
      const expiredRefreshTokens = await RefreshToken.countDocuments({
        revoked: false,
        expiresAt: { $lte: new Date() }
      });

      res.json({
        success: true,
        data: {
          accessTokenBlacklist: stats,
          refreshTokens: {
            total: totalRefreshTokens,
            active: activeRefreshTokens,
            revoked: revokedRefreshTokens,
            expired: expiredRefreshTokens
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Clear all blacklisted tokens (use with caution!)
  async clearBlacklist(req, res, next) {
    try {
      const { confirm } = req.body;

      if (confirm !== 'YES_DELETE_ALL') {
        return res.status(400).json({
          success: false,
          message: 'Please confirm by sending { "confirm": "YES_DELETE_ALL" }'
        });
      }

      const deletedCount = await tokenBlacklist.clearAll();

      res.json({
        success: true,
        message: `Cleared ${deletedCount} blacklisted access tokens`,
        data: { deletedCount }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get specific token info
  async getTokenInfo(req, res, next) {
    try {
      const { jti } = req.params;

      const info = await tokenBlacklist.getTokenInfo(jti);

      if (!info) {
        return res.status(404).json({
          success: false,
          message: 'Token not found in blacklist'
        });
      }

      res.json({
        success: true,
        data: info
      });
    } catch (error) {
      next(error);
    }
  }

  // Revoke all tokens for a specific user (admin action)
  async revokeUserTokens(req, res, next) {
    try {
      const { userId } = req.params;

      // Revoke all refresh tokens
      const result = await RefreshToken.updateMany(
        { user: userId, revoked: false },
        { revoked: true, revokedAt: new Date() }
      );

      res.json({
        success: true,
        message: `Revoked all tokens for user ${userId}`,
        data: {
          revokedCount: result.modifiedCount
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // System health check with Redis info
  async getSystemHealth(req, res, next) {
    try {
      const redisHealth = await redisClient.healthCheck();
      const redisClientInstance = redisClient.getClient();

      // Get Redis info
      let redisInfo = null;
      if (redisHealth.status === 'healthy') {
        const info = await redisClientInstance.info();
        const lines = info.split('\r\n');
        redisInfo = {
          version: lines.find(l => l.startsWith('redis_version:'))?.split(':')[1],
          uptime_days: lines.find(l => l.startsWith('uptime_in_days:'))?.split(':')[1],
          connected_clients: lines.find(l => l.startsWith('connected_clients:'))?.split(':')[1],
          used_memory_human: lines.find(l => l.startsWith('used_memory_human:'))?.split(':')[1],
          total_connections_received: lines.find(l => l.startsWith('total_connections_received:'))?.split(':')[1]
        };
      }

      res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          redis: {
            ...redisHealth,
            info: redisInfo
          },
          blacklist: await tokenBlacklist.getStats()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Cleanup expired refresh tokens (can be run as cron job)
  async cleanupExpiredTokens(req, res, next) {
    try {
      const result = await RefreshToken.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      res.json({
        success: true,
        message: `Cleaned up ${result.deletedCount} expired refresh tokens`,
        data: { deletedCount: result.deletedCount }
      });
    } catch (error) {
      next(error);
    }
  }

  // 1️⃣ Dashboard Stats - Chỉ trả về số liệu tổng quan
  async getDashboardStats(req, res, next) {
    try {
      const { timeRange = 'month' } = req.query;

      const now = new Date();
      let startDate = new Date();

      switch (timeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Current period - CHỈ TÍNH ĐƠN ĐÃ HOÀN THÀNH & THANH TOÁN
      const [totalRevenue, totalOrders, totalUsers, totalProducts, pendingOrders] = await Promise.all([
        Order.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate },
              status: 'delivered',
              paymentStatus: 'paid'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' }
            }
          }
        ]),
        Order.countDocuments({ createdAt: { $gte: startDate } }),
        User.countDocuments({ createdAt: { $gte: startDate } }),
        Product.countDocuments(),
        Order.countDocuments({ status: 'pending_payment' })
      ]);

      // Previous period
      const prevStartDate = new Date(startDate);
      prevStartDate.setTime(prevStartDate.getTime() - (now - startDate));

      const [prevRevenue, prevOrders, prevUsers] = await Promise.all([
        Order.aggregate([
          {
            $match: {
              createdAt: { $gte: prevStartDate, $lt: startDate },
              status: 'delivered',
              paymentStatus: 'paid'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' }
            }
          }
        ]),
        Order.countDocuments({ createdAt: { $gte: prevStartDate, $lt: startDate } }),
        User.countDocuments({ createdAt: { $gte: prevStartDate, $lt: startDate } })
      ]);

      // Calculate percentage changes
      const revenueChange = prevRevenue[0]?.total
        ? ((totalRevenue[0]?.total - prevRevenue[0].total) / prevRevenue[0].total * 100).toFixed(1)
        : 0;

      const ordersChange = prevOrders
        ? ((totalOrders - prevOrders) / prevOrders * 100).toFixed(1)
        : 0;

      const usersChange = prevUsers
        ? ((totalUsers - prevUsers) / prevUsers * 100).toFixed(1)
        : 0;

      res.json({
        success: true,
        data: {
          totalRevenue: totalRevenue[0]?.total || 0,
          totalOrders,
          totalUsers,
          totalProducts,
          pendingOrders,
          revenueChange: parseFloat(revenueChange),
          ordersChange: parseFloat(ordersChange),
          usersChange: parseFloat(usersChange)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // 2️⃣ Analytics - Trả về chart data & best sellers
  async getAnalytics(req, res, next) {
    try {
      const { timeRange = 'month' } = req.query;

      const now = new Date();
      let startDate = new Date();
      let groupBy;
      let formatLabel;

      switch (timeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          groupBy = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          };
          formatLabel = (doc) => `${doc._id.month}/${doc._id.day}`;
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          groupBy = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          };
          formatLabel = (doc) => `${doc._id.month}/${doc._id.day}`;
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          groupBy = {
            year: { $year: '$createdAt' },
            week: { $week: '$createdAt' }
          };
          formatLabel = (doc) => `Week ${doc._id.week}`;
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          groupBy = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          };
          formatLabel = (doc) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return months[doc._id.month - 1];
          };
          break;
      }

      // Revenue and orders over time
      const rawChartData = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: 'delivered',
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: groupBy,
            revenue: { $sum: '$totalAmount' },
            profit: {
              $sum: {
                $subtract: ['$totalAmount', '$taxAmount']
              }
            },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
      ]);

      // Format chart data
      const chartData = rawChartData.map(doc => ({
        name: formatLabel(doc),
        revenue: Math.round(doc.revenue),
        profit: Math.round(doc.profit),
        orders: doc.orders
      }));

      // Best selling products
      const bestSellers = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: 'delivered',
            paymentStatus: 'paid'
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            name: { $first: '$items.productName' },
            image: { $first: '$items.imageUrl' },
            sold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.totalPrice' }
          }
        },
        { $sort: { sold: -1 } },
        { $limit: 10 }
      ]);

      res.json({
        success: true,
        data: {
          chartData,
          bestSellers
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all discount codes
  async getAllDiscounts(req, res, next) {
    try {
      const discounts = await DiscountCode.find()
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name email');

      res.json({
        success: true,
        data: discounts
      });
    } catch (error) {
      next(error);

    }
  };

  // Create discount code
  async createDiscount(req, res, next) {
    try {
      const { code, discountType, discountValue, usageLimit, minOrderAmount, maxDiscountAmount } = req.body;

      // Validate code format
      if (!/^[A-Z0-9]{5}$/.test(code)) {
        return res.status(400).json({
          success: false,
          message: 'Code must be 5 alphanumeric characters'
        });
      }

      // Check if code already exists
      const existing = await DiscountCode.findOne({ code });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Discount code already exists'
        });
      }

      const discount = await DiscountCode.create({
        code: code.toUpperCase(),
        discountType,
        discountValue,
        usageLimit,
        minOrderAmount,
        maxDiscountAmount,
        createdBy: req.user.id
      });

      res.status(201).json({
        success: true,
        data: discount,
        message: 'Discount code created successfully'
      });
    } catch (error) {
      next(error);

    }
  };

  // Delete discount code
  async deleteDiscount(req, res, next) {
    try {
      const { code } = req.params;

      const discount = await DiscountCode.findOneAndDelete({ code: code.toUpperCase() });

      if (!discount) {
        return res.status(404).json({
          success: false,
          message: 'Discount code not found'
        });
      }

      res.json({
        success: true,
        message: 'Discount code deleted successfully'
      });
    } catch (error) {
      next(error);

    }
  };

  // Get discount usage
  async getDiscountUsage(req, res, next) {
    try {
      const { code } = req.params;

      console.log(code)


      const discount = await DiscountCode.findOne({ code: code.toUpperCase() })
        .populate({
          path: 'usedBy.user',
          select: 'fullName email'
        })
        .populate({
          path: 'usedBy.order',
          select: 'customerName customerEmail subtotal discountAmount totalAmount createdAt'
        });

      if (!discount) {
        return res.status(404).json({
          success: false,
          message: 'Discount code not found'
        });
      }

      const usage = discount.usedBy
        .filter(entry => entry.order)
        .map(entry => {
          const order = entry.order;

          return {
            _id: order._id,
            customer: {
              name: order.customerName,
              email: order.customerEmail
            },
            originalTotal: order.subtotal,
            discountAmount: order.discountAmount,
            total: order.totalAmount,
            createdAt: order.createdAt
          };
        });


      console.log(discount);


      res.json({
        success: true,
        data: {
          code: discount.code,
          percentage: discount.percentage,
          maxUses: discount.maxUses,
          used: discount.used,
          usage: usage
        }
      });
    } catch (error) {
      next(error);

    }
  };

}

module.exports = new AdminController();