import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCartStore } from '@/store/cartStore';
import { orderAPI } from '@/services/api';
import { useAuthStore } from '@/store/authStore'; // Thêm import này

export default function PaymentSuccess() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { clearCart } = useCartStore();
    const { isAuthenticated } = useAuthStore();

    const [orderDetails, setOrderDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const orderId = searchParams.get('orderId');

    useEffect(() => {
        clearCart();

        const fetchOrderDetails = async () => {
            if (!orderId) {
                setLoading(false);
                return;
            }

            try {
                const response = await orderAPI.getOrderById(orderId);
                setOrderDetails(response.data.data);
            } catch (error) {
                console.error('Failed to fetch order:', error);
                setError(error.response?.data?.message || 'Failed to load order details');
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetails();
    }, [orderId, clearCart]);

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader className="text-center pb-6">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl mb-2">Payment Successful!</CardTitle>
                        <p className="text-muted-foreground">
                            Thank you for your order. Your payment has been processed successfully.
                        </p>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                <p className="text-muted-foreground mt-4">Loading order details...</p>
                            </div>
                        ) : orderDetails ? (
                            <>
                                <div className="bg-muted p-4 rounded-lg space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Order Number</span>
                                        <span className="font-medium">{orderDetails.orderNumber}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Total Amount</span>
                                        <span className="font-medium text-lg">{orderDetails.totalAmount.toLocaleString('vi-VN')} ₫</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Payment Method</span>
                                        <span className="font-medium">VNPay</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Payment Status</span>
                                        <span className="font-medium text-green-600">Paid</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    {isAuthenticated ? (
                                        <Button
                                            className="flex-1"
                                            onClick={() => navigate(`/orders/${orderId}`)}
                                        >
                                            <Package className="h-4 w-4 mr-2" />
                                            View Order Details
                                        </Button>
                                    ) : (
                                        <Button
                                            className="flex-1"
                                            onClick={() => navigate('/track-order')}
                                        >
                                            <Search className="h-4 w-4 mr-2" />
                                            Track Order
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        onClick={() => navigate('/shop')}
                                    >
                                        Continue Shopping
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Guest isAuthenticated hoặc không load được order */}
                                <div className="text-center py-4">
                                    <p className="text-muted-foreground mb-2">
                                        {error || 'Unable to load order details'}
                                    </p>
                                    {orderId && (
                                        <p className="text-sm text-muted-foreground">
                                            Order ID: {orderId.slice(0, 8).toUpperCase()}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {!isAuthenticated && (
                                        <>
                                            <Button
                                                className="w-full"
                                                onClick={() => navigate('/track-order')}
                                            >
                                                <Search className="h-4 w-4 mr-2" />
                                                Track Your Order
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="w-full"
                                                onClick={() => navigate('/login')}
                                            >
                                                Sign In to View Orders
                                            </Button>
                                        </>
                                    )}
                                    {isAuthenticated && (
                                        <Button
                                            className="w-full"
                                            onClick={() => navigate('/orders')}
                                        >
                                            View All Orders
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                                <strong>What's next?</strong> You'll receive an email confirmation shortly.
                                {isAuthenticated
                                    ? ' You can track your order status in your order history.'
                                    : ' Use the order tracking feature to check your order status anytime.'
                                }
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}