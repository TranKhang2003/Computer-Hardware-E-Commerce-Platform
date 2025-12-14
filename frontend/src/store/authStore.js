import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '@/services/api';

export const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            refreshToken: null,
            accessToken: null,
            isAuthenticated: false,

            setAuth: (user, refreshToken, accessToken) => set({
                user,
                refreshToken,
                accessToken,
                isAuthenticated: true
            }),
            
            // ⭐ QUAN TRỌNG: dùng khi refresh token thành công
            setTokens: (accessToken, refreshToken) =>
                set({
                    accessToken,
                    refreshToken,
                    isAuthenticated: true
                }),

            logout: () => set({
                user: null,
                refreshToken: null,
                accessToken: null,
                isAuthenticated: false
            }),

            updateUser: (newUser) =>
                set(() => ({
                    user: newUser, // set nguyên object user mới
                })),

            // // 🔵 Thêm mới địa chỉ
            // addAddress: (address) => set((state) => ({
            //     user: {
            //         ...state.user,
            //         addresses: [...(state.user?.addresses || []), address]
            //     }
            // })),

            // // 🟣 Update 1 địa chỉ theo index
            // updateAddress: (index, updatedData) => set((state) => {
            //     const newAddresses = [...state.user.addresses];
            //     newAddresses[index] = { ...newAddresses[index], ...updatedData };

            //     return {
            //         user: {
            //             ...state.user,
            //             addresses: newAddresses
            //         }
            //     };
            // }),

            // // 🟡 Set địa chỉ mặc định
            // setDefaultAddress: (index) => set((state) => {
            //     const updated = state.user.addresses.map((addr, i) => ({
            //         ...addr,
            //         isDefault: i === index
            //     }));

            //     return {
            //         user: {
            //             ...state.user,
            //             addresses: updated
            //         }
            //     };
            // }),

            fetchCurrentUser: async () => {
                try {
                    const response = await authAPI.getProfile();
                    set({ user: response.data.data.user, isAuthenticated: true });
                } catch (error) {
                    console.error('Failed to fetch current user:', error);
                }
            },


        }),
        {
            name: 'auth-storage',
        }
    )
);