const User = require('../models/User');
const Order = require('../models/Order');
const mongoose = require('mongoose');

class UserController {
  async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, search, role, status } = req.query;

      // Build filter
      const filter = {};
      if (search) {
        filter.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      if (role) filter.role = role;
      if (status) filter.status = status;

      const skip = (page - 1) * limit;

      // Get users
      const users = await User.find(filter)
        .select('-passwordHash') // totalSpent đã có trong user
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(skip)
        .lean();

      const total = await User.countDocuments(filter);

      // Chỉ lấy totalOrders từ Order
      const userIds = users.map(u => u._id);

      const orderStats = await Order.aggregate([
        {
          $match: {
            userId: { $in: userIds } // sửa từ 'user' → 'userId'
          }
        },
        {
          $group: {
            _id: '$userId',
            totalOrders: {
              $sum: {
                $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0]
              }
            }
          }
        }
      ]);


      const statsMap = new Map(
        orderStats.map(stat => [
          stat._id.toString(),
          { totalOrders: stat.totalOrders }
        ])
      );

      const usersWithStats = users.map(user => {
        const stats = statsMap.get(user._id.toString()) || { totalOrders: 0 };

        return {
          ...user,
          totalOrders: stats.totalOrders,
          totalSpent: user.totalSpent || 0 // dùng luôn field từ User
        };
      });

      res.json({
        success: true,
        data: {
          users: usersWithStats,
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

  async toggleUserBan(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot ban admin users'
        });
      }

      // Toggle status between 'active' and 'banned'
      const newStatus = user.status === 'banned' ? 'active' : 'banned';
      user.status = newStatus;
      await user.save();

      res.json({
        success: true,
        data: user,
        message: newStatus === 'banned'
          ? 'User banned successfully'
          : 'User unbanned successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId)
        .select('-passwordHash')
        .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get order stats
      const [orderStats] = await Order.aggregate([
        {
          $match: {
            user: mongoose.Types.ObjectId(userId)
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
          }
        }
      ]);


      res.json({
        success: true,
        data: {
          ...user,
          totalOrders: orderStats?.totalOrders || 0,
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();