import axiosInstance from '@/lib/axios';

// Auth APIs
export const authAPI = {
    login: (credentials) => axiosInstance.post('/auth/login', credentials),
    register: (userData) => axiosInstance.post('/auth/register', userData),
    logout: () => axiosInstance.post('/auth/logout'),
    getProfile: () => axiosInstance.get('/auth/me'),
    // updateProfile: (userData) => axiosInstance.put('/auth/profile', userData),
    // changePassword: (passwords) => axiosInstance.put('/auth/password', passwords),

    forgotPassword: (data) => axiosInstance.post('/auth/forgot-password', data),
    resetPassword: (data) => axiosInstance.post('/auth/reset-password', data),

    // Profile
    updateProfile: (data) => axiosInstance.patch('/auth/profile', data),
    changePassword: (data) => axiosInstance.post('/auth/profile/change-password', data),

    // Avatar methods
    uploadAvatar: (file) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return axiosInstance.post('/auth/profile/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
    deleteAvatar: () => axiosInstance.delete('/auth/profile/avatar'),

    // Addresses
    addAddress: (data) => axiosInstance.post('/auth/profile/addresses', data),
    updateAddress: (addressId, data) => axiosInstance.patch(`/auth/profile/addresses/${addressId}`, data),
    deleteAddress: (addressId) => axiosInstance.delete(`/auth/profile/addresses/${addressId}`),
    setDefaultAddress: (addressId) => axiosInstance.patch(`/auth/profile/addresses/${addressId}/default`),
};



export const productAPI = {
    getAll: (params) => axiosInstance.get('/products', { params }),
    getAllProducts: (params) => axiosInstance.get('/products', { params }),
    getById: (id) => axiosInstance.get(`/products/${id}`),
    getBySlug: (slug) => axiosInstance.get(`/products/slug/${slug}`),
    getBrands: () => axiosInstance.get('/products/brands'),
    getCategories: () => axiosInstance.get('/products/categories'),
};

// };

export const orderAPI = {
    // Customer
    createOrder: (data) => axiosInstance.post('/orders', data),
    getMyOrders: (params) => axiosInstance.get('/orders/my-orders', { params }),
    getOrderById: (orderId) => axiosInstance.get(`/orders/${orderId}`),
    cancelOrder: (orderId, data) => axiosInstance.post(`/orders/${orderId}/cancel`, data),
    trackOrder: (orderNumber, email) => axiosInstance.post('/orders/track', { orderNumber, email }),

    // Discount
    validateDiscountCode: (data) => axiosInstance.post('/orders/validate-discount', data),

    // Admin
    getAllOrders: (params) => axiosInstance.get('/orders/admin/all', { params }),
    updateOrderStatus: (orderId, data) => axiosInstance.patch(`/orders/admin/${orderId}/status`, data),


    createVNPayPayment: (data) => axiosInstance.post('/payment/vnpay/create', data),
};

export const cartAPI = {
    // Get cart
    getCart: async () => {
        const response = await axiosInstance.get('/cart');
        return response.data;
    },

    // Add item
    addItem: async (productId, variantId, quantity) => {
        const response = await axiosInstance.post('/cart/add', {
            productId,
            variantId,
            quantity
        });
        return response.data;
    },

    // Update quantity
    updateQuantity: async (variantId, quantity) => {
        const response = await axiosInstance.put('/cart/update', {
            variantId,
            quantity
        });
        return response.data;
    },

    // Remove item
    removeItem: async (variantId) => {
        const response = await axiosInstance.delete('/cart/remove', {
            data: { variantId }
        });
        return response.data;
    },

    // Clear cart
    clearCart: async () => {
        const response = await axiosInstance.delete('/cart/clear');
        return response.data;
    },

    // Merge cart (pass local items)
    mergeCart: async (localItems) => {
        const response = await axiosInstance.post('/cart/merge', {
            items: localItems
        });
        return response.data;
    },

    // Sync cart
    syncCart: async (items) => {
        const response = await axiosInstance.post('/cart/sync', {
            items
        });
        return response.data;
    }
};


export const reviewAPI = {
    getByProduct: (productId) => axiosInstance.get(`/products/${productId}/reviews`),
    create: (productId, data) => axiosInstance.post(`/products/${productId}/reviews`, data),
};

export const commentAPI = {
    // Get all comments for a product
    getByProduct: (productId) =>
        axiosInstance.get(`/products/${productId}/comments`),

    // Get comment count
    getCount: (productId) =>
        axiosInstance.get(`/products/${productId}/comments/count`),

    // Create a new comment
    create: (productId, data) =>
        axiosInstance.post(`/products/${productId}/comments`, data),

    // Update a comment
    update: (productId, commentId, data) =>
        axiosInstance.put(`/products/${productId}/comments/${commentId}`, data),

    // Delete a comment
    delete: (productId, commentId) =>
        axiosInstance.delete(`/products/${productId}/comments/${commentId}`),
};



// Admin APIs
export const adminAPI = {
    // Dashboard
    getDashboard: () => axiosInstance.get('/admin/dashboard'),
    getStatistics: (params) => axiosInstance.get('/admin/analytics', { params }),
    getAll: (params) => axiosInstance.get('/admin/products', { params }),

    // uploadImage: (data) => axiosInstance.post('/admin/upload/image', data),

    uploadImage: (formData) => axiosInstance.post('/admin/upload/image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        }
    }),

    // Products
    createProduct: (product) => axiosInstance.post('/admin/products', product),
    updateProduct: (id, product) => axiosInstance.put(`/admin/products/${id}`, product),
    deleteProduct: (id) => axiosInstance.delete(`/admin/products/${id}`),

    // Users
    getAllUsers: (params) => axiosInstance.get('/admin/users', { params }),
    updateUser: (id, userData) => axiosInstance.put(`/admin/users/${id}`, userData),
    banUser: (id) => axiosInstance.put(`/admin/users/${id}/ban`),

    // Orders
    // getAllOrders: (params) => axiosInstance.get('/admin/orders', { params }),
    getAllOrders: (params) => axiosInstance.get('/orders/admin/all', { params }),

    // Discounts
    getDiscounts: () => axiosInstance.get('/admin/discounts'),
    createDiscount: (discount) => axiosInstance.post('/admin/discounts', discount),
    getDiscountUsage: (code) => axiosInstance.get(`/admin/discounts/${code}/usage`),
    deleteDiscount: (code) => axiosInstance.delete(`/admin/discounts/${code}`),
};