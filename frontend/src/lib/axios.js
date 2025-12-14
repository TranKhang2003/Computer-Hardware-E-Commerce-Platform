import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const axiosInstance = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
    // withCredentials: true,
});

// Flag để tránh multiple refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

// Request interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().accessToken;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Nếu lỗi 401 và chưa retry
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Nếu đang refresh, đợi trong queue
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return axiosInstance(originalRequest);
                    })
                    .catch(err => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = useAuthStore.getState().refreshToken;

            if (!refreshToken) {
                // Không có refresh token, logout
                useAuthStore.getState().logout();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                // Gọi API refresh token
                const response = await axios.post(`${API_URL}/auth/refresh`, {
                    token: refreshToken
                });

                const { accessToken } = response.data.data;
                const newRefreshToken = refreshToken; // backend không trả refresh token mới

                // Cập nhật tokens mới
                useAuthStore.getState().setTokens(accessToken, newRefreshToken);

                // Process các requests đang chờ
                processQueue(null, accessToken);

                // Retry request ban đầu với token mới
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return axiosInstance(originalRequest);

            } catch (refreshError) {
                // Refresh token hết hạn hoặc invalid
                processQueue(refreshError, null);
                useAuthStore.getState().logout();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Xử lý các lỗi khác
        if (error.response) {
            switch (error.response.status) {
                case 403:
                    console.error('Access forbidden');
                    break;

                case 404:
                    console.error('Resource not found');
                    break;

                case 500:
                    console.error('Server error');
                    break;

                default:
                    console.error('An error occurred');
            }
        } else if (error.request) {
            console.error('No response from server');
        } else {
            console.error('Error setting up request');
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;