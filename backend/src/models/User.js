const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES, USER_STATUS, OAUTH_PROVIDERS } = require('../config/constants');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  passwordHash: {
    type: String,
    select: false
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.CUSTOMER
  },
  status: {
    type: String,
    enum: Object.values(USER_STATUS),
    default: USER_STATUS.ACTIVE
  },
  avatarUrl: String,
  emailVerified: {
    type: Boolean,
    default: false
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },

  // OAuth accounts
  oauthAccounts: [{
    provider: {
      type: String,
      enum: Object.values(OAUTH_PROVIDERS)
    },
    providerId: String,
    expiresAt: Date
  }],

  // Addresses
  addresses: [{
    fullName: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    ward: String,
    district: String,
    city: String,
    postalCode: String,
    isDefault: {
      type: Boolean,
      default: false
    }
  }],

  lastLoginAt: Date
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'oauthAccounts.provider': 1, 'oauthAccounts.providerId': 1 });

// Virtual for default address
userSchema.virtual('defaultAddress').get(function () {
  return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
});

// Methods
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.__v;
  return user;
};

// Static methods
userSchema.statics.hashPassword = async function (password) {
  return await bcrypt.hash(password, 10);
};

// Middleware
userSchema.pre('save', function (next) {
  // Ensure only one default address
  if (this.isModified('addresses')) {
    const defaultAddresses = this.addresses.filter(addr => addr.isDefault);
    if (defaultAddresses.length > 1) {
      this.addresses.forEach((addr, idx) => {
        if (idx > 0) addr.isDefault = false;
      });
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);