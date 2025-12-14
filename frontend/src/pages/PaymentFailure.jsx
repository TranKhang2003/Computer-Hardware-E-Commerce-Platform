import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, RefreshCw, ArrowLeft, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { orderAPI } from '@/services/api';
import { useAuthStore } from '@/store/authStore'; // Thêm import

export default function PaymentFailure() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAuthenticated } = useAuthStore();

    const [orderDetails, setOrderDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(false);

    const orderId = searchParams.get('orderId');
    const message = searchParams.get('message');

    useEffect(() => {
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
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetails();
    }, [orderId]);

    const handleRetryPayment = async () => {
        if (!orderId) return;

        setRetrying(true);

        try {
            const response = await orderAPI.createVNPayPayment({ orderId });
            window.location.href = response.data.data.paymentUrl;
        } catch (error) {
            console.error('Failed to retry payment:', error);
            setRetrying(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader className="text-center pb-6">
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <XCircle className="h-10 w-10 text-red-600" />
                        </div>
                        <CardTitle className="text-2xl mb-2">Payment Failed</CardTitle>
                        <p className="text-muted-foreground">
                            Unfortunately, your payment could not be processed.
                        </p>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {message && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                        )}

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
                                        <span className="text-muted-foreground">Payment Status</span>
                                        <span className="font-medium text-red-600">Failed</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Button
                                        className="w-full"
                                        onClick={handleRetryPayment}
                                        disabled={retrying}
                                    >
                                        {retrying ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Redirecting...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                Retry Payment
                                            </>
                                        )}
                                    </Button>

                                    {isAuthenticated ? (
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => navigate(`/orders/${orderId}`)}
                                        >
                                            View Order Details
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => navigate('/track-order')}
                                        >
                                            <Search className="h-4 w-4 mr-2" />
                                            Track Order
                                        </Button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-center py-4">
                                    <p className="text-muted-foreground mb-4">
                                        {orderId ? 'Order not found' : 'No order information available'}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {!isAuthenticated ? (
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
                                                Sign In
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => navigate('/orders')}
                                        >
                                            <ArrowLeft className="h-4 w-4 mr-2" />
                                            Back to Orders
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800">
                                <strong>Need help?</strong> If you continue to experience issues,
                                please contact our support team or try a different payment method.
                            </p>
                        </div>

                        <div className="text-center">
                            <Button
                                variant="link"
                                onClick={() => navigate('/shop')}
                            >
                                Continue Shopping
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}