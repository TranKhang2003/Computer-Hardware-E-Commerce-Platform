import { useState, useEffect } from 'react';
import { Eye, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { adminAPI, orderAPI } from '@/services/api';
import { toast } from 'sonner';

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showDialog, setShowDialog] = useState(false);
    const [filters, setFilters] = useState({
        dateRange: 'all',
        status: 'all',
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });

    useEffect(() => {
        fetchOrders();
    }, [pagination.page, filters]);

    const fetchOrders = async () => {
        try {
            const response = await adminAPI.getAllOrders({
                page: pagination.page,
                limit: pagination.limit,
                ...filters,
            });
            setOrders(response.data.data.orders || []);
            setPagination(response.data.data.pagination);
        } catch (error) {
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const handleViewOrder = async (orderId) => {
        try {
            // Sử dụng API getOrderById thay vì getAllOrders
            const response = await orderAPI.getOrderById(orderId);

            setSelectedOrder(response.data.data); // Trả về object đơn, không phải array
            setShowDialog(true);
        } catch (error) {
            toast.error('Failed to load order details');
        }
    };



    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await orderAPI.updateOrderStatus(orderId, { status: newStatus, totalSpent: selectedOrder?.totalAmount || 0, userId: selectedOrder?.userId || null });
            toast.success('Order status updated!');
            fetchOrders();
            if (selectedOrder?._id === orderId) {
                handleViewOrder(orderId);
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending_payment: 'bg-yellow-500',
            confirmed: 'bg-blue-500',
            processing: 'bg-indigo-500',
            shipping: 'bg-purple-500',
            delivered: 'bg-green-500',
            cancelled: 'bg-red-500',
        };
        return colors[status] || 'bg-gray-500';
    };

    const formatStatus = (status) => {
        return status.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const dateRangeOptions = [
        { value: 'all', label: 'All Time' },
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' },
    ];

    const statusOptions = [
        { value: 'all', label: 'All Status' },
        { value: 'pending_payment', label: 'Pending Payment' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'processing', label: 'Processing' },
        { value: 'shipping', label: 'Shipping' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'refunded', label: 'Refunded' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Orders</h1>
                    <p className="text-muted-foreground">Manage customer orders</p>
                </div>
                <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date Range</Label>
                                <Select
                                    value={filters.dateRange}
                                    onValueChange={(value) =>
                                        setFilters({ ...filters, dateRange: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dateRangeOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={filters.status}
                                    onValueChange={(value) =>
                                        setFilters({ ...filters, status: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">
                            Loading orders...
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No orders found
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order Number</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order._id}>
                                        <TableCell className="font-medium">
                                            {order.orderNumber}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{order.customerName}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {order.customerEmail}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                                        </TableCell>
                                        <TableCell>{order.items?.length || 0}</TableCell>
                                        <TableCell>
                                            {order.totalAmount.toLocaleString('vi-VN')} ₫
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusColor(order.status)}>
                                                {formatStatus(order.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleViewOrder(order._id)}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="p-4 border-t">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() =>
                                                setPagination({
                                                    ...pagination,
                                                    page: Math.max(1, pagination.page - 1),
                                                })
                                            }
                                            className={
                                                pagination.page === 1
                                                    ? 'pointer-events-none opacity-50'
                                                    : 'cursor-pointer'
                                            }
                                        />
                                    </PaginationItem>

                                    {[...Array(pagination.totalPages)].map((_, i) => (
                                        <PaginationItem key={i + 1}>
                                            <PaginationLink
                                                onClick={() =>
                                                    setPagination({ ...pagination, page: i + 1 })
                                                }
                                                isActive={pagination.page === i + 1}
                                                className="cursor-pointer"
                                            >
                                                {i + 1}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}

                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() =>
                                                setPagination({
                                                    ...pagination,
                                                    page: Math.min(
                                                        pagination.totalPages,
                                                        pagination.page + 1
                                                    ),
                                                })
                                            }
                                            className={
                                                pagination.page === pagination.totalPages
                                                    ? 'pointer-events-none opacity-50'
                                                    : 'cursor-pointer'
                                            }
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Order Detail Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Order Details - {selectedOrder?.orderNumber}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-6">
                            {/* Customer Info */}
                            <div>
                                <h3 className="font-semibold mb-3">Customer Information</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Name</p>
                                        <p className="font-medium">{selectedOrder.customerName}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Email</p>
                                        <p className="font-medium">{selectedOrder.customerEmail}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Phone</p>
                                        <p className="font-medium">{selectedOrder.customerPhone}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Payment Method</p>
                                        <p className="font-medium uppercase">
                                            {selectedOrder.paymentMethod}
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-muted-foreground">Shipping Address</p>
                                        <p className="font-medium">
                                            {selectedOrder.shippingAddress?.addressLine1}
                                            {selectedOrder.shippingAddress?.addressLine2 &&
                                                `, ${selectedOrder.shippingAddress.addressLine2}`}
                                            <br />
                                            {selectedOrder.shippingAddress?.ward}, {selectedOrder.shippingAddress?.district}
                                            <br />
                                            {selectedOrder.shippingAddress?.city} {selectedOrder.shippingAddress?.postalCode}
                                        </p>
                                    </div>
                                    {selectedOrder.note && (
                                        <div className="col-span-2">
                                            <p className="text-muted-foreground">Note</p>
                                            <p className="font-medium">{selectedOrder.note}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Order Items */}
                            <div>
                                <h3 className="font-semibold mb-3">Order Items</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Quantity</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedOrder.items?.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        {item.imageUrl && (
                                                            <img
                                                                src={item.productId.images[0].url || item.imageUrl || 'https://dlcdnwebimgs.asus.com/files/media/69c52e00-bea3-4e79-8344-3690f8cc94f2/v1/assets/image/proart/article_img_01.jpg'}
                                                                alt={item.productName}
                                                                className="w-12 h-12 object-cover rounded"
                                                            />
                                                        )}
                                                        <div>
                                                            <p className="font-medium">
                                                                {item.productName}
                                                            </p>
                                                            {item.variantName && (
                                                                <p className="text-sm text-muted-foreground">
                                                                    Variant: {item.variantName}
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-muted-foreground">
                                                                SKU: {item.sku}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>
                                                    {item.unitPrice.toLocaleString('vi-VN')} ₫
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.totalPrice.toLocaleString('vi-VN')} ₫
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Order Summary */}
                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>{selectedOrder.subtotal?.toLocaleString('vi-VN')} ₫</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Shipping Fee</span>
                                        <span>{selectedOrder.shippingFee?.toLocaleString('vi-VN')} ₫</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Tax (10%)</span>
                                        <span>{selectedOrder.taxAmount?.toLocaleString('vi-VN')} ₫</span>
                                    </div>
                                    {selectedOrder.discountAmount > 0 && (
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span>
                                                Discount {selectedOrder.discountCode && `(${selectedOrder.discountCode})`}
                                            </span>
                                            <span>-{selectedOrder.discountAmount?.toLocaleString('vi-VN')} ₫</span>
                                        </div>
                                    )}
                                    {selectedOrder.loyaltyDiscount > 0 && (
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span>Loyalty Points ({selectedOrder.loyaltyPointsUsed} points)</span>
                                            <span>-{selectedOrder.loyaltyDiscount?.toLocaleString('vi-VN')} ₫</span>
                                        </div>
                                    )}
                                    <Separator />
                                    <div className="flex justify-between font-semibold text-lg">
                                        <span>Total</span>
                                        <span>{selectedOrder.totalAmount?.toLocaleString('vi-VN')} ₫</span>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Order Status */}
                            <div>
                                <h3 className="font-semibold mb-3">Order Status</h3>
                                <div className="flex items-center gap-4">
                                    <Select
                                        value={selectedOrder.status}
                                        onValueChange={(value) =>
                                            handleStatusChange(selectedOrder._id, value)
                                        }
                                    >
                                        <SelectTrigger className="w-48">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions
                                                .filter((opt) => opt.value !== 'all')
                                                .map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    <Badge className={getStatusColor(selectedOrder.status)}>
                                        {formatStatus(selectedOrder.status)}
                                    </Badge>
                                </div>

                                {/* Status History */}
                                {selectedOrder.statusHistory?.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium mb-2">Status History</h4>
                                        <div className="space-y-2">
                                            {selectedOrder.statusHistory.map((history, index) => (
                                                <div key={index} className="text-sm flex justify-between items-start border-l-2 border-muted pl-3">
                                                    <div>
                                                        <p className="font-medium">{formatStatus(history.status)}</p>
                                                        <p className="text-muted-foreground text-xs">{history.note}</p>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(history.createdAt).toLocaleString('vi-VN')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Payment Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Payment Status</h3>
                                    <Badge variant={selectedOrder.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                                        {selectedOrder.paymentStatus}
                                    </Badge>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Order Date</h3>
                                    <p className="text-sm">
                                        {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}