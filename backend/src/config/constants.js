module.exports = {
    USER_ROLES: {
        CUSTOMER: 'customer',
        ADMIN: 'admin',
        SUPER_ADMIN: 'super_admin'
    },

    USER_STATUS: {
        ACTIVE: 'active',
        BANNED: 'banned',
        PENDING: 'pending'
    },

    ORDER_STATUS: {
        PENDING_PAYMENT: 'pending_payment',
        PAID: 'paid',
        CONFIRMED: 'confirmed',
        PROCESSING: 'processing',
        SHIPPING: 'shipping',
        DELIVERED: 'delivered',
        CANCELLED: 'cancelled',
        REFUNDED: 'refunded'
    },

    PAYMENT_METHOD: {
        COD: 'cod',
        VNPAY: 'vnpay',
        MOMO: 'momo',
        ZALOPAY: 'zalopay'
    },

    PAYMENT_STATUS: {
        PENDING: 'pending',
        PROCESSING: 'processing',
        PAID: 'paid',
        FAILED: 'failed',
        REFUNDED: 'refunded'
    },

    PRODUCT_STATUS: {
        DRAFT: 'draft',
        ACTIVE: 'active',
        OUT_OF_STOCK: 'out_of_stock',
        DISCONTINUED: 'discontinued'
    },

    OAUTH_PROVIDERS: {
        GOOGLE: 'google',
        FACEBOOK: 'facebook',
        GITHUB: 'github'
    },

    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 20,
        MAX_LIMIT: 100
    },

    SETTINGS: {
        TAX_RATE: 0.1,
        SHIPPING_FEE: 30000,
        FREE_SHIPPING_THRESHOLD: 1000000,
        LOYALTY_EARN_RATE: 0.1,
        LOYALTY_REDEEM_RATE: 1,
        CART_EXPIRE_DAYS: 7
    },

    VNPAY: {
        TMN_CODE: process.env.VNP_TMN_CODE || 'YOUR_TMN_CODE',
        HASH_SECRET: process.env.VNP_HASH_SECRET || 'YOUR_HASH_SECRET',
        URL: process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        RETURN_URL: process.env.VNP_RETURN_URL || 'http://localhost:3000/payment/vnpay-return',
        API_URL: process.env.VNP_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
        IPN_URL: process.env.VNP_IPN_URL || 'http://localhost:5000/api/v1/payment/vnpay/ipn'
    }
};