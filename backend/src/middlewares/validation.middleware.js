const { body, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  next();
};

// Register validation
exports.validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),
  body('phone')
    .optional()
    .isMobilePhone('vi-VN')
    .withMessage('Please provide a valid Vietnamese phone number'),
  handleValidationErrors
];

// Login validation
exports.validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Cart item validation
exports.validateCartItem = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('variantId')
    .notEmpty()
    .withMessage('Variant ID is required')
    .isMongoId()
    .withMessage('Invalid variant ID'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  handleValidationErrors
];

// Order validation
exports.validateOrder = [
  body('customerEmail')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('customerName')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required'),
  body('customerPhone')
    .notEmpty()
    .withMessage('Phone number is required'),
  body('shippingAddress.addressLine1')
    .notEmpty()
    .withMessage('Address is required'),
  body('shippingAddress.district')
    .notEmpty()
    .withMessage('District is required'),
  body('shippingAddress.city')
    .notEmpty()
    .withMessage('City is required'),
  body('paymentMethod')
    .isIn(['cod', 'vnpay', 'momo', 'zalopay'])
    .withMessage('Invalid payment method'),
  handleValidationErrors
];

// Review validation
exports.validateReview = [
  body('productId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
  handleValidationErrors
];

// Comment validation
exports.validateComment = [
  body('productId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('authorName')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Comment is required')
    .isLength({ max: 500 })
    .withMessage('Comment must not exceed 500 characters'),
  body('authorEmail')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
];
