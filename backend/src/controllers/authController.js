const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const PasswordResetToken = require('../models/PasswordResetToken');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const tokenBlacklist = require('../services/tokenBlacklist.service');
const { sendEmail } = require('../services/emailService');

class AuthController {
  constructor() {
    // Bind all methods to maintain 'this' context
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    this.logout = this.logout.bind(this);
    this.getCurrentUser = this.getCurrentUser.bind(this);
    this.oauthCallback = this.oauthCallback.bind(this);
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

      const user = await User.findOne({ email, status: 'active' });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      // Tạo token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1h

      await PasswordResetToken.create({ user: user._id, token, expiresAt });

      // Gửi email
      await sendEmail({
        to: user.email,
        template: 'FORGOT_PASSWORD',
        data: { fullName: user.fullName, token }
      });

      res.json({ success: true, message: 'Password reset email sent' });
    } catch (error) {
      next(error);
    }
  }

  // 2️⃣ Reset password bằng token
  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Token and new password are required' });
      }

      const resetToken = await PasswordResetToken.findOne({ token }).populate('user');
      if (!resetToken) return res.status(400).json({ success: false, message: 'Invalid token' });
      if (resetToken.used) return res.status(400).json({ success: false, message: 'Token already used' });
      if (resetToken.expiresAt < new Date()) return res.status(400).json({ success: false, message: 'Token expired' });

      // Cập nhật mật khẩu
      resetToken.user.passwordHash = await User.hashPassword(newPassword);
      await resetToken.user.save();

      // Mark token as used
      resetToken.used = true;
      await resetToken.save();

      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Generate short-lived access token (15 minutes)
  generateAccessToken(user) {
    const tokenId = crypto.randomBytes(16).toString('hex');

    return jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        jti: tokenId // JWT ID để tracking và blacklist
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
  }

  // Generate long-lived refresh token (7 days)
  async generateRefreshToken(user) {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const refreshToken = await RefreshToken.create({
      token,
      user: user._id,
      expiresAt
    });

    return refreshToken.token;
  }

  async register(req, res, next) {
    try {
      const { email, password, fullName, address } = req.body;

      // Validate required fields
      if (!email || !password || !fullName) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, and fullName are required'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Hash password
      const passwordHash = await User.hashPassword(password);

      // Create user with address
      const userData = {
        email,
        passwordHash,
        fullName
      };

      // Add address if provided
      if (address) {
        userData.addresses = [address];
      }

      const user = await User.create(userData);

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user);

      await sendEmail({
        to: user.email,
        template: 'REGISTER_SUCCESS',
        data: { fullName: user.fullName }
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toJSON(),
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Login with email and password
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find active user with password
      const user = await User.findOne({ email, status: 'active' })
        .select('+passwordHash');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user);


      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }


  // Refresh access token using refresh token
  async refreshToken(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Find and validate refresh token
      const storedToken = await RefreshToken.findOne({ token }).populate('user');

      if (!storedToken) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      if (storedToken.revoked) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token has been revoked'
        });
      }

      if (storedToken.expiresAt < new Date()) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token has expired'
        });
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(storedToken.user);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { accessToken }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current authenticated user
  async getCurrentUser(req, res, next) {
    try {
      // req.user is set by auth middleware
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  // 2. Update logout method
  async logout(req, res, next) {
    try {
      const { token } = req.body;
      const accessToken = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Revoke refresh token
      const result = await RefreshToken.updateOne(
        { token },
        { revoked: true, revokedAt: new Date() }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Refresh token not found'
        });
      }

      // Blacklist access token
      if (accessToken) {
        await tokenBlacklist.blacklist(accessToken);
      }

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  // 3. Thêm method logoutAll
  async logoutAll(req, res, next) {
    try {
      const userId = req.user.id;
      const accessToken = req.headers.authorization?.replace('Bearer ', '');

      // Revoke all refresh tokens
      await RefreshToken.updateMany(
        { user: userId, revoked: false },
        { revoked: true, revokedAt: new Date() }
      );

      // Blacklist current access token
      if (accessToken) {
        await tokenBlacklist.blacklist(accessToken);
      }

      res.json({
        success: true,
        message: 'Logged out from all devices successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async oauthCallback(req, res, next) {
    try {
      const user = req.user;

      // ❌ Kiểm tra nếu không có user (OAuth failed)
      if (!user) {
        return res.redirect(
          `${process.env.CLIENT_URL}/oauth-failure?error=authentication_failed&message=Unable to authenticate with OAuth provider`
        );
      }

      // ❌ Kiểm tra status
      if (user.status !== 'active') {
        return res.redirect(
          `${process.env.CLIENT_URL}/oauth-failure?error=account_inactive&message=Your account is not active`
        );
      }

      // ✅ Update last login
      user.lastLoginAt = new Date();
      await user.save();

      // ✅ Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user);

      // ✅ Redirect về success page
      const params = new URLSearchParams({
        success: 'true',
        accessToken,
        refreshToken,
        user: JSON.stringify(user.toJSON()),
      });

      res.redirect(`${process.env.CLIENT_URL}/oauth-success?${params.toString()}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(
        `${process.env.CLIENT_URL}/oauth-failure?error=server_error&message=An unexpected error occurred`
      );
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { fullName, phone, avatarUrl } = req.body;

      // Only allow updating specific fields
      const updateData = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (phone !== undefined) updateData.phone = phone;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-passwordHash');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  // User: Change password
  async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters'
        });
      }

      // Get user with password
      const user = await User.findById(userId).select('+passwordHash');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user has a password (OAuth users might not have one)
      if (!user.passwordHash) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change password for OAuth accounts'
        });
      }

      // Verify current password
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash and update new password
      user.passwordHash = await User.hashPassword(newPassword);
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // User: Add new address
  async addAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const { fullName, phone, addressLine1, addressLine2, ward, district, city, postalCode, isDefault } = req.body;

      // Validate required fields
      if (!fullName || !phone || !addressLine1 || !ward || !district || !city) {
        return res.status(400).json({
          success: false,
          message: 'Full name, phone, address line 1, ward, district, and city are required'
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // If this is the first address or marked as default, set it as default
      const shouldBeDefault = isDefault || user.addresses.length === 0;

      // If setting as default, unset other default addresses
      if (shouldBeDefault) {
        user.addresses.forEach(addr => {
          addr.isDefault = false;
        });
      }

      // Add new address
      user.addresses.push({
        fullName,
        phone,
        addressLine1,
        addressLine2,
        ward,
        district,
        city,
        postalCode,
        isDefault: shouldBeDefault
      });

      await user.save();

      res.json({
        success: true,
        message: 'Address added successfully',
        data: user.addresses
      });
    } catch (error) {
      next(error);
    }
  }

  // User: Update existing address
  async updateAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const { addressId } = req.params;
      const { fullName, phone, addressLine1, addressLine2, ward, district, city, postalCode, isDefault } = req.body;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const address = user.addresses.id(addressId);

      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      // Update address fields
      if (fullName !== undefined) address.fullName = fullName;
      if (phone !== undefined) address.phone = phone;
      if (addressLine1 !== undefined) address.addressLine1 = addressLine1;
      if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
      if (ward !== undefined) address.ward = ward;
      if (district !== undefined) address.district = district;
      if (city !== undefined) address.city = city;
      if (postalCode !== undefined) address.postalCode = postalCode;

      // Handle default address
      if (isDefault) {
        user.addresses.forEach(addr => {
          addr.isDefault = false;
        });
        address.isDefault = true;
      }

      await user.save();

      res.json({
        success: true,
        message: 'Address updated successfully',
        data: user.addresses
      });
    } catch (error) {
      next(error);
    }
  }

  // User: Delete address
  async deleteAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const { addressId } = req.params;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const addressIndex = user.addresses.findIndex(
        addr => addr._id.toString() === addressId
      );

      if (addressIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      const wasDefault = user.addresses[addressIndex].isDefault;

      // Remove address
      user.addresses.splice(addressIndex, 1);

      // If deleted address was default, set first address as default
      if (wasDefault && user.addresses.length > 0) {
        user.addresses[0].isDefault = true;
      }

      await user.save();

      res.json({
        success: true,
        message: 'Address deleted successfully',
        data: user.addresses
      });
    } catch (error) {
      next(error);
    }
  }

  // User: Set default address
  async setDefaultAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const { addressId } = req.params;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const address = user.addresses.id(addressId);

      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      // Unset all default addresses
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });

      // Set this address as default
      address.isDefault = true;

      await user.save();

      res.json({
        success: true,
        message: 'Default address updated successfully',
        data: user.addresses
      });
    } catch (error) {
      next(error);
    }
  }

}
module.exports = new AuthController();