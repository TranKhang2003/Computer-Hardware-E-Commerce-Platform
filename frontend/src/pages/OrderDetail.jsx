import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, MapPin, CreditCard, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { orderAPI } from '@/services/api';
import { toast } from 'sonner';

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const response = await orderAPI.getOrderById(id);
                setOrder(response.data.data);
            } catch (error) {
                toast.error('Failed to load order');
                navigate('/orders');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [id, navigate]);

    if (loading || !order) {
        return <div className="container mx-auto px-4 py-8">Loading...</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Order Details</h1>
                <p className="text-muted-foreground">
                    Order #{order._id.slice(0, 8).toUpperCase()}
                </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Order Items */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Order Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Variant</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.items.map((item) => (
                                        <TableRow key={item._id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={item.productId.images[0].url || item.imageUrl || 'https://dlcdnwebimgs.asus.com/files/media/69c52e00-bea3-4e79-8344-3690f8cc94f2/v1/assets/image/proart/article_img_01.jpg'}
                                                        alt={item.productName}
                                                        className="w-12 h-12 object-cover rounded"
                                                    />
                                                    <span className="font-medium">{item.productName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{item.variantName || '-'}</TableCell>
                                            <TableCell>{item.unitPrice.toLocaleString('vi-VN')} ₫</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell className="text-right">
                                                {item.totalPrice.toLocaleString('vi-VN')} ₫
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Order Timeline */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Order Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {order.statusHistory?.reverse().map((status, index) => (
                                    <div key={index} className="flex items-start gap-4">
                                        <div className="mt-1">
                                            <div className="w-3 h-3 rounded-full bg-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium capitalize">{status.status}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(status.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Order Summary */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>{order.subtotal.toLocaleString('vi-VN')} ₫</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Shipping</span>
                                <span>{order.shippingFee.toLocaleString('vi-VN')} ₫</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax</span>
                                <span>{order.taxAmount.toLocaleString('vi-VN')} ₫</span>
                            </div>
                            {order.discountAmount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Discount</span>
                                    <span>-${order.discountAmount.toLocaleString('vi-VN')} ₫</span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total</span>
                                <span>{order.totalAmount.toLocaleString('vi-VN')} ₫</span>
                            </div>
                            {order.loyaltyPointsUsed > 0 && (
                                <div className="bg-muted p-3 rounded-lg text-sm">
                                    <p className="font-medium">Points Used</p>
                                    <p className="text-primary font-bold">
                                        {order.loyaltyPointsUsed} points
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Shipping Address
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-medium">{order.customerName}</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                {order.shippingAddress.addressLine1}
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                {order?.shippingAddress?.addressLine2}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {order.shippingAddress.city}, {order.shippingAddress.postalCode}
                            </p>
                            {order.customerPhone && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    Phone: {order.customerPhone}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
