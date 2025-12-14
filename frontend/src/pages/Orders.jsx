import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await orderAPI.getMyOrders();
                setOrders(response.data.data.orders || []);
            } catch (error) {
                toast.error('Failed to load orders');
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const getStatusColor = (status) => {
        const colors = {
            pending: 'bg-yellow-500',
            confirmed: 'bg-blue-500',
            shipping: 'bg-purple-500',
            delivered: 'bg-green-500',
            cancelled: 'bg-red-500',
        };
        return colors[status] || 'bg-gray-500';
    };

    if (loading) {
        return <div className="container mx-auto px-4 py-8">Loading...</div>;
    }

    if (orders.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16">
                <Card className="max-w-md mx-auto">
                    <CardContent className="p-12 text-center">
                        <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
                        <p className="text-muted-foreground mb-6">
                            Start shopping to see your orders here
                        </p>
                        <Button asChild>
                            <Link to="/products">Start Shopping</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">My Orders</h1>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow key={order._id}>
                                    <TableCell className="font-medium">
                                        #{order._id.slice(0, 8).toUpperCase()}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    {/* <TableCell>${order.taxAmount.toFixed(2)}</TableCell> */}
                                    <TableCell>{order.totalAmount.toLocaleString('vi-VN')} ₫</TableCell>
                                    <TableCell>
                                        <Badge className={getStatusColor(order.status)}>
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link to={`/orders/${order._id}`}>
                                                <Eye className="h-4 w-4 mr-2" />
                                                View Details
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
