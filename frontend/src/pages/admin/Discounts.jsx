import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, Tag, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { adminAPI } from '@/services/api';
import { toast } from 'sonner';

export default function AdminDiscounts() {
    const [discounts, setDiscounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showUsageDialog, setShowUsageDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedDiscount, setSelectedDiscount] = useState(null);
    const [discountUsage, setDiscountUsage] = useState([]);

    const initForm = {
        code: '',
        discountType: 'percentage',
        discountValue: '',
        usageLimit: 10,
        minOrderAmount: 0,
        maxDiscountAmount: null,
        isActive: true
    }

    const [formData, setFormData] = useState(initForm);


    useEffect(() => {
        fetchDiscounts();
    }, []);

    const fetchDiscounts = async () => {
        try {
            const response = await adminAPI.getDiscounts();
            setDiscounts(response.data.data || []);
        } catch (error) {
            toast.error('Failed to load discounts');
        } finally {
            setLoading(false);
        }
    };

    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData({ ...formData, code });
    };

    const handleCreate = async (e) => {
        e.preventDefault();

        if (formData.code.length !== 5) {
            toast.error('Code must be exactly 5 characters');
            return;
        }

        if (formData.discountValue < 1 || formData.discountValue > 100) {
            toast.error('Percentage must be between 1 and 100');
            return;
        }

        if (formData.usageLimit < 1 || formData.usageLimit > 10) {
            toast.error('Max uses must be between 1 and 10');
            return;
        }

        try {
            const payload = {
                code: formData.code.toUpperCase(),
                discountType: 'percentage',
                discountValue: parseInt(formData.discountValue),
                usageLimit: parseInt(formData.usageLimit),
                isActive: true,
                minOrderAmount: formData.minOrderAmount ? parseInt(formData.minOrderAmount) : 0,
                maxDiscountAmount: formData.maxDiscountAmount ? parseInt(formData.maxDiscountAmount) : null
            };

            await adminAPI.createDiscount(payload);
            toast.success('Discount code created successfully!');
            setShowCreateDialog(false);
            setFormData(initForm);

            // Refresh discounts
            fetchDiscounts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create discount');
        }
    };

    const handleViewUsage = async (discount) => {
        try {
            const response = await adminAPI.getDiscountUsage(discount.code);
            setDiscountUsage(response.data.data.usage || []);
            setSelectedDiscount(discount);
            setShowUsageDialog(true);
        } catch (error) {
            toast.error('Failed to load usage data');
        }
    };

    const handleDelete = async () => {
        try {
            await adminAPI.deleteDiscount(selectedDiscount.code);
            toast.success('Discount deleted successfully!');
            setShowDeleteDialog(false);
            fetchDiscounts();
        } catch (error) {
            toast.error('Failed to delete discount');
        }
    };

    const getUsageColor = (usedCount, max) => {
        const percentage = (usedCount / max) * 100;
        if (percentage >= 100) return 'text-red-600';
        if (percentage >= 75) return 'text-orange-600';
        if (percentage >= 50) return 'text-yellow-600';
        return 'text-green-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Discount Codes</h1>
                    <p className="text-muted-foreground">
                        Manage promotional discount codes
                    </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Discount
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active Codes
                        </CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {discounts.filter((d) => d.usedCount < d.usageLimit).length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Uses
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {discounts && discounts.length > 0
                                ? discounts.reduce((sum, d) => sum + (d.usedCount || 0), 0)
                                : 0}
                        </div>

                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Discounts
                        </CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{discounts.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Discounts Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead>Usage</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {discounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No discount codes yet. Create one to get started!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                discounts.map((discount) => {
                                    const isExpired = discount.usedCount >= discount.usageLimit;
                                    return (
                                        <TableRow key={discount.code}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Tag className="h-4 w-4 text-primary" />
                                                    <span className="font-mono font-bold text-lg">
                                                        {discount.code}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-base">
                                                    {discount.discountValue}% OFF
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p
                                                        className={`font-medium ${getUsageColor(
                                                            discount.usedCount,
                                                            discount.usageLimit
                                                        )}`}
                                                    >
                                                        {discount.usedCount} / {discount.usageLimit}
                                                    </p>
                                                    <div className="w-full bg-muted rounded-full h-2 mt-1">
                                                        <div
                                                            className="bg-primary h-2 rounded-full"
                                                            style={{
                                                                width: `${Math.min(
                                                                    100,
                                                                    (discount.usedCount / discount.usageLimit) * 100
                                                                )}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(discount.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                {isExpired ? (
                                                    <Badge variant="destructive">Expired</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Active</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewUsage(discount)}
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View Usage
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedDiscount(discount);
                                                            setShowDeleteDialog(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create Discount Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Discount Code</DialogTitle>
                        <DialogDescription>
                            Create a new promotional discount code for customers
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Discount Code (5 characters) *</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            code: e.target.value.toUpperCase().slice(0, 5),
                                        })
                                    }
                                    placeholder="SAVE5"
                                    maxLength={5}
                                    className="font-mono text-lg"
                                    required
                                />
                                <Button type="button" variant="outline" onClick={generateCode}>
                                    Generate
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Must be exactly 5 alphanumeric characters
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="percentage">Discount Percentage (%) *</Label>
                            <Input
                                id="percentage"
                                type="number"
                                min="1"
                                max="100"
                                value={formData.discountValue}
                                onChange={(e) =>
                                    setFormData({ ...formData, discountValue: e.target.value })
                                }
                                placeholder="10"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Enter a value between 1 and 100
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="minOrderAmount">Minimum Order Amount</Label>
                            <Input
                                id="minOrderAmount"
                                type="number"
                                min="10000"
                                value={formData.minOrderAmount}
                                onChange={(e) =>
                                    setFormData({ ...formData, minOrderAmount: e.target.value })
                                }
                                placeholder="0"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Enter a value between 10000đ and 10000000đ
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="maxDiscountAmount ">Maximum Discount Amount</Label>
                            <Input
                                id="maxDiscountAmount "
                                type="number"
                                min="10000"
                                value={formData.maxDiscountAmount}
                                onChange={(e) =>
                                    setFormData({ ...formData, maxDiscountAmount: e.target.value })
                                }
                                placeholder="0"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Enter a value between 10000đ and 10000000đ
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="usageLimit">Maximum Uses *</Label>
                            <Input
                                id="usageLimit"
                                type="number"
                                min="1"
                                max="10"
                                value={formData.usageLimit}
                                onChange={(e) =>
                                    setFormData({ ...formData, usageLimit: e.target.value })
                                }
                                placeholder="10"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                How many times this code can be used (max 10)
                            </p>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowCreateDialog(false);
                                    setFormData(initForm);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Create Discount</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Usage Dialog */}
            <Dialog open={showUsageDialog} onOpenChange={setShowUsageDialog}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            Usage History - {selectedDiscount?.code}
                        </DialogTitle>
                        <DialogDescription>
                            View all orders that used this discount code
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {discountUsage.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground">
                                No orders have used this discount code yet
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Original</TableHead>
                                        <TableHead>Discount</TableHead>
                                        <TableHead>Final</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {discountUsage.map((order) => (
                                        <TableRow key={order._id}>
                                            <TableCell className="font-mono">
                                                {order._id.slice(-6).toUpperCase()}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{order.customer.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {order.customer.email}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                ${order.originalTotal?.toFixed(2) || '0.00'}
                                            </TableCell>
                                            <TableCell className="text-green-600 font-medium">
                                                -${order.discountAmount?.toFixed(2) || '0.00'}
                                            </TableCell>
                                            <TableCell className="font-bold">
                                                ${order.total.toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setShowUsageDialog(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Discount Code?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the discount code{' '}
                            <span className="font-mono font-bold">
                                {selectedDiscount?.code}
                            </span>
                            ? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}