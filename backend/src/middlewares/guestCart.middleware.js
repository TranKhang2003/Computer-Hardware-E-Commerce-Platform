const { v4: uuidv4 } = require('uuid');

const guestCartMiddleware = (req, res, next) => {
    // đảm bảo req.cookies đã tồn tại (cookie-parser)
    if (!req.cookies) req.cookies = {};

    // khai báo biến cartId
    let cartId = req.cookies.cartId;

    if (!cartId) {
        cartId = uuidv4(); // ✅ bây giờ hợp lệ
        res.cookie('cartId', cartId, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
            sameSite: 'lax'
        });
    }

    req.cartId = cartId; // lưu vào req để middleware/route dùng
    next();
};

module.exports = guestCartMiddleware;
