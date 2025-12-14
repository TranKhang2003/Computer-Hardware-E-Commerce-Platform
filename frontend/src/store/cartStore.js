import { cartAPI } from '@/services/api';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const SHIPPING_FEE = Number(import.meta.env.VITE_SHIPPING_FEE || 25);
const SHIPPING_THRESHOLD = Number(import.meta.env.VITE_SHIPPING_THRESHOLD || 5000000);
const TAX_RATE = Number(import.meta.env.VITE_TAX_RATE || 0.1);

export const useCartStore = create(
    persist(
        (set, get) => ({
            items: [],
            mode: "guest",
            syncing: false,
            loading: false,

            setMode: (mode) => set({ mode }),
            setItems: (items) => set({ items }),
            setSyncing: (syncing) => set({ syncing }),
            setLoading: (loading) => set({ loading }),

            // ✅ ADD ITEM
            addItem: async (product, variant, quantity = 1) => {
                const { mode } = get();

                try {
                    set({ loading: true });

                    if (mode === "user") {
                        // ✅ User mode: Gọi API trực tiếp
                        const response = await cartAPI.addItem(
                            product._id,
                            variant._id,
                            quantity
                        );

                        set({ items: response.data.items });
                        return response.data.items;
                    } else {
                        // ✅ Guest mode: Update local + gọi API
                        const { items } = get();
                        const existingItem = items.find(
                            item => item.product._id === product._id &&
                                item.variant?._id === variant?._id
                        );

                        let newItems;
                        if (existingItem) {
                            newItems = items.map(item =>
                                item.product._id === product._id &&
                                    item.variant?._id === variant?._id
                                    ? { ...item, quantity: item.quantity + quantity }
                                    : item
                            );
                        } else {
                            newItems = [...items, { product, variant, quantity }];
                        }

                        set({ items: newItems });

                        // Call API để sync với server
                        try {
                            await cartAPI.addItem(product._id, variant._id, quantity);
                        } catch (error) {
                            console.error('Failed to sync cart with server:', error);
                        }

                        return newItems;
                    }
                } catch (error) {
                    console.error('Add item error:', error);
                    throw error;
                } finally {
                    set({ loading: false });
                }
            },

            // ✅ UPDATE QUANTITY
            updateQuantity: async (productId, variantId, quantity) => {
                const { mode, items } = get();

                try {
                    set({ loading: true });

                    if (quantity <= 0) {
                        return get().removeItem(productId, variantId);
                    }

                    if (mode === "user") {
                        const response = await cartAPI.updateQuantity(variantId, quantity);
                        set({ items: response.data.items });
                    } else {
                        const newItems = items.map(item =>
                            item.product._id === productId &&
                                item.variant?._id === variantId
                                ? { ...item, quantity }
                                : item
                        );
                        set({ items: newItems });

                        try {
                            await cartAPI.updateQuantity(variantId, quantity);
                        } catch (error) {
                            console.error('Failed to sync quantity:', error);
                        }
                    }
                } finally {
                    set({ loading: false });
                }
            },

            // ✅ REMOVE ITEM
            removeItem: async (productId, variantId) => {
                const { mode, items } = get();

                try {
                    set({ loading: true });

                    if (mode === "user") {
                        const response = await cartAPI.removeItem(variantId);
                        set({ items: response.data.items });
                    } else {
                        const newItems = items.filter(
                            item => !(item.product._id === productId &&
                                item.variant?._id === variantId)
                        );
                        set({ items: newItems });

                        try {
                            await cartAPI.removeItem(variantId);
                        } catch (error) {
                            console.error('Failed to sync remove:', error);
                        }
                    }
                } finally {
                    set({ loading: false });
                }
            },

            // ✅ CLEAR CART
            clearCart: async () => {
                const { mode } = get();

                try {
                    set({ loading: true, items: [] });

                    if (mode === "user") {
                        await cartAPI.clearCart();
                    }
                } finally {
                    set({ loading: false });
                }
            },

            // Price helpers
            getPrice: (item) => {
                let price = item.variant
                    ? item.product.basePrice + (item.variant.priceAdjustment || 0)
                    : item.product.basePrice;

                if (item.product.discount) {
                    price = price * (1 - item.product.discount / 100);
                }

                return Math.max(price, 0);
            },



            getTotalItems: () => {
                return get().items.reduce((total, item) =>
                    total + item.quantity, 0
                );
            },


            getSubtotal: () => {
                return get().items.reduce((total, item) => {
                    const price = get().getPrice(item);
                    return total + price * item.quantity;
                }, 0);
            },
            getShipping: () => (get().getSubtotal() > SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE),
            getTax: () => get().getSubtotal() * TAX_RATE,
            getTotal: () => get().getSubtotal() + get().getShipping() + get().getTax(),


        }),
        {
            name: 'cart-storage',
        }
    )
);