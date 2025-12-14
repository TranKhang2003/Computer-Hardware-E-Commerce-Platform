import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { cartAPI } from '@/services/api';

export default function OAuthSuccess() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setAuth } = useAuthStore();
    const { items, setItems, setMode } = useCartStore();

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                // ✅ Lấy data từ URL params
                const accessToken = searchParams.get('accessToken');
                const refreshToken = searchParams.get('refreshToken');
                const userString = searchParams.get('user');
                const success = searchParams.get('success');

                if (!accessToken || !refreshToken || !userString || success !== 'true') {
                    throw new Error('Missing or invalid authentication data');
                }

                // ✅ Parse user data
                const user = JSON.parse(decodeURIComponent(userString));

                // ✅ Lưu vào auth store
                setAuth(user, refreshToken, accessToken);

                setMode('user');

                try {
                    const localCart = items;
                    if (localCart.length > 0) {
                        const mergeRes = await cartAPI.mergeCart(localCart);
                        setItems(mergeRes.data.items);
                    } else {
                        const cartRes = await cartAPI.getCart();
                        setItems(cartRes.data.items || []);
                    }
                } catch (cartError) {
                    console.error('Cart merge error:', cartError);
                }


                toast.success('Login successful!');

                // ✅ Redirect
                const from = sessionStorage.getItem('oauth_redirect') || '/';
                sessionStorage.removeItem('oauth_redirect');

                // Delay nhỏ để user thấy loading
                setTimeout(() => {
                    navigate(from, { replace: true });
                }, 500);

            } catch (error) {
                console.error('OAuth callback error:', error);
                toast.error('Authentication failed. Please try again.');
                navigate('/login', { replace: true });
            }
        };

        handleOAuthCallback();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Completing sign in...</p>
            </div>
        </div>
    );
}