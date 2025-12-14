const crypto = require('crypto');

// Generate random string
exports.generateRandomString = (length = 32) => {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);
};

// Generate slug from string
exports.slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start
        .replace(/-+$/, '');            // Trim - from end
};

exports.generateSKU = async (categoryName) => {
    if (!categoryName) throw new Error('Category name is required');

    // Lấy 3 ký tự đầu của tên danh mục, in hoa
    const prefix = categoryName.substring(0, 3).toUpperCase();

    // Tạo phần ngẫu nhiên 4 ký tự (hex)
    const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();

    return `${prefix}-${randomPart}`;
}

exports.parseImages = (images) => {
    if (!images) return [];
    return images.map(imgStr => {
        try {
            const fixedStr = imgStr
                .replace(/(\r\n|\n|\r)/gm, '')
                .replace(/ObjectId\("([a-f0-9]+)"\)/g, '"$1"')
                .replace(/'/g, '"');
            return JSON.parse(fixedStr);
        } catch {
            return null;
        }
    }).filter(Boolean);
};

// Format currency
exports.formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
};

// Calculate pagination
exports.calculatePagination = (page, limit, total) => {
    const currentPage = parseInt(page) || 1;
    const itemsPerPage = parseInt(limit) || 20;
    const totalPages = Math.ceil(total / itemsPerPage);
    const skip = (currentPage - 1) * itemsPerPage;

    return {
        page: currentPage,
        limit: itemsPerPage,
        total,
        totalPages,
        skip,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
    };
};

// Generate order number
exports.generateOrderNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${dateStr}-${random}`;
};

// Generate discount code
exports.generateDiscountCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// Validate Vietnamese phone number
exports.isValidVietnamesePhone = (phone) => {
    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    return phoneRegex.test(phone);
};

// Parse sort query
exports.parseSortQuery = (sortBy, sortOrder = 'desc') => {
    const sort = {};
    const fields = sortBy.split(',');

    fields.forEach(field => {
        const order = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
        sort[field.trim()] = order;
    });

    return sort;
};

// Build filter query
exports.buildFilterQuery = (filters) => {
    const query = {};

    Object.keys(filters).forEach(key => {
        const value = filters[key];

        if (value === undefined || value === null || value === '') {
            return;
        }

        // Handle different filter types
        if (key === 'search') {
            query.$text = { $search: value };
        } else if (key.startsWith('min_')) {
            const field = key.replace('min_', '');
            query[field] = query[field] || {};
            query[field].$gte = parseFloat(value);
        } else if (key.startsWith('max_')) {
            const field = key.replace('max_', '');
            query[field] = query[field] || {};
            query[field].$lte = parseFloat(value);
        } else if (Array.isArray(value)) {
            query[key] = { $in: value };
        } else {
            query[key] = value;
        }
    });

    return query;
};