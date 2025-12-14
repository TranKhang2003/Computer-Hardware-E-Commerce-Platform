import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, MapPin, Tag, Plus, CheckCircle, User, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { authAPI, orderAPI } from '@/services/api';
import { toast } from 'sonner';

const SHIPPING_THRESHOLD = Number(import.meta.env.VITE_SHIPPING_THRESHOLD || 5000000);

export default function Checkout() {
    const navigate = useNavigate();
    const { items, clearCart } = useCartStore();
    const { user, isAuthenticated, updateUser, fetchCurrentUser } = useAuthStore();
    const subtotal = useCartStore(state => state.getSubtotal());
    const shippingFee = useCartStore(state => state.getShipping());
    const taxAmount = useCartStore(state => state.getTax());

    const [loading, setLoading] = useState(false);
    const [validatingDiscount, setValidatingDiscount] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cod');

    const PAYMENT_METHODS = [
        { id: 'cod', label: 'Cash on Delivery (COD)', icon: CreditCard },
        { id: 'vnpay', label: 'VNPay', icon: Tag },
    ];


    // Customer info (for both guest and logged-in users)
    const [customerInfo, setCustomerInfo] = useState({
        fullName: user?.fullName || '',
        email: user?.email || '',
    });

    // Shipping address - for guest users or new address
    const [shippingAddress, setShippingAddress] = useState({
        fullName: user?.fullName || '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        ward: '',
        district: '',
        city: '',
        postalCode: '',
    });

    // For logged-in users with saved addresses
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [showAddressDialog, setShowAddressDialog] = useState(false);
    const [newAddress, setNewAddress] = useState({
        fullName: user?.fullName || '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        ward: '',
        district: '',
        city: '',
        postalCode: '',
        isDefault: false,
    });

    // Discount & loyalty
    const [discountCode, setDiscountCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [loyaltyPointsUsed, setLoyaltyPointsUsed] = useState(0);

    // Note
    const [note, setNote] = useState('');

    // Initialize with default address for logged-in users
    useEffect(() => {
        if (isAuthenticated && user?.addresses?.length > 0) {
            const defaultAddr = user.addresses.find(a => a.isDefault) || user.addresses[0];
            setSelectedAddressId(defaultAddr._id);
        }
    }, [user, isAuthenticated]);

    useEffect(() => {
        if (items.length === 0) {
            navigate('/cart');
        }
    }, [items, navigate]);

    const discountAmount = appliedDiscount?.discountAmount || 0;
    const loyaltyDiscount = loyaltyPointsUsed * 1000;
    const total = subtotal + shippingFee + taxAmount - discountAmount - loyaltyDiscount;

    const maxLoyaltyPoints = Math.min(
        user?.loyaltyPoints || 0,
        Math.floor(subtotal / 1000)
    );

    const handleCustomerInfoChange = (e) => {
        setCustomerInfo({
            ...customerInfo,
            [e.target.name]: e.target.value,
        });
    };

    const handleShippingAddressChange = (e) => {
        setShippingAddress({
            ...shippingAddress,
            [e.target.name]: e.target.value,
        });
    };

    const handleAddressChange = (e) => {
        setNewAddress({
            ...newAddress,
            [e.target.name]: e.target.value,
        });
    };

    const handleAddNewAddress = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await authAPI.addAddress(newAddress);
            updateUser({ ...user, addresses: response.data.data });

            const addedAddress = response.data.data[response.data.data.length - 1];
            setSelectedAddressId(addedAddress._id);

            toast.success('Address added successfully!');
            setShowAddressDialog(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add address');
        } finally {
            setLoading(false);
        }
    };

    const handleValidateDiscount = async () => {
        if (!discountCode.trim()) {
            toast.error('Please enter a discount code');
            return;
        }

        setValidatingDiscount(true);

        try {
            const response = await orderAPI.validateDiscountCode({
                code: discountCode,
                subtotal
            });

            setAppliedDiscount(response.data.data);
            toast.success(response.data.data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid discount code');
            setAppliedDiscount(null);
        } finally {
            setValidatingDiscount(false);
        }
    };

    const handleRemoveDiscount = () => {
        setAppliedDiscount(null);
        setDiscountCode('');
    };

    const handleLoyaltyPointsChange = (e) => {
        const value = parseInt(e.target.value) || 0;
        setLoyaltyPointsUsed(Math.min(value, maxLoyaltyPoints));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (items.length === 0) {
            toast.error('Your cart is empty');
            return;
        }

        // Validate customer info
        if (!customerInfo.fullName || !customerInfo.email) {
            toast.error('Please fill in your name and email');
            return;
        }

        // Get shipping address based on user type
        let finalShippingAddress;
        let finalCustomerPhone;

        if (isAuthenticated && selectedAddressId) {
            // Logged-in user with saved address
            const selectedAddress = user?.addresses?.find(a => a._id === selectedAddressId);
            if (!selectedAddress) {
                toast.error('Please select a valid shipping address');
                return;
            }
            finalShippingAddress = {
                addressLine1: selectedAddress.addressLine1,
                addressLine2: selectedAddress.addressLine2,
                ward: selectedAddress.ward,
                district: selectedAddress.district,
                city: selectedAddress.city,
                postalCode: selectedAddress.postalCode,
            };
            finalCustomerPhone = selectedAddress.phone;
        } else {
            // Guest user or logged-in user without saved addresses
            if (!shippingAddress.phone || !shippingAddress.addressLine1 ||
                !shippingAddress.ward || !shippingAddress.district || !shippingAddress.city) {
                toast.error('Please fill in complete shipping address');
                return;
            }
            finalShippingAddress = {
                addressLine1: shippingAddress.addressLine1,
                addressLine2: shippingAddress.addressLine2,
                ward: shippingAddress.ward,
                district: shippingAddress.district,
                city: shippingAddress.city,
                postalCode: shippingAddress.postalCode,
            };
            finalCustomerPhone = shippingAddress.phone;
        }

        setLoading(true);

        try {
            const orderData = {
                customerName: customerInfo.fullName,
                customerEmail: customerInfo.email,
                customerPhone: finalCustomerPhone,
                shippingAddress: finalShippingAddress,
                items: items.map(item => ({
                    productId: item.product._id,
                    variantId: item.variant?._id || null,
                    quantity: item.quantity,
                })),
                discountCode: appliedDiscount?.code,
                loyaltyPointsUsed,
                paymentMethod: paymentMethod,
                note: note.trim() || undefined,
            };

            const response = await orderAPI.createOrder(orderData);

            await fetchCurrentUser();


            if (paymentMethod === 'vnpay' && response.data.data.requiresPayment) {
                const paymentResponse = await orderAPI.createVNPayPayment({
                    orderId: response.data.data.orderId
                });
                window.location.href = paymentResponse.data.data.paymentUrl;
            } else {
                clearCart();
                toast.success('Order placed successfully!');
                navigate(`/orders/${response.data.data.orderId}`);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    const selectedAddress = user?.addresses?.find(a => a._id === selectedAddressId);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Checkout</h1>
                {!isAuthenticated && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="text-sm">
                            Checking out as guest •
                            <a href="/login" className="text-primary hover:underline ml-1">Sign in</a> to save your information
                        </span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Customer Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Contact Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="fullName">Full Name *</Label>
                                        <Input
                                            id="fullName"
                                            name="fullName"
                                            value={customerInfo.fullName}
                                            onChange={handleCustomerInfoChange}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="email">Email *</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={customerInfo.email}
                                            onChange={handleCustomerInfoChange}
                                            required
                                            disabled={isAuthenticated}
                                        />
                                    </div>
                                </div>
                                {!isAuthenticated && (
                                    <p className="text-sm text-muted-foreground">
                                        We'll send order confirmation to this email
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Shipping Address */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Shipping Address
                                    </CardTitle>
                                    {isAuthenticated && user?.addresses?.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowAddressDialog(true)}
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add New
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isAuthenticated && user?.addresses?.length > 0 ? (
                                    /* Saved addresses for logged-in users */
                                    <div className="space-y-3">
                                        {user.addresses.map((address) => (
                                            <div
                                                key={address._id}
                                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedAddressId === address._id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'hover:border-primary/50'
                                                    }`}
                                                onClick={() => setSelectedAddressId(address._id)}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="font-medium">{address.fullName}</p>
                                                            {address.isDefault && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    Default
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mb-1">
                                                            {address.phone}
                                                        </p>
                                                        <p className="text-sm">
                                                            {address.addressLine1}
                                                            {address.addressLine2 && `, ${address.addressLine2}`}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {address.ward}, {address.district}, {address.city}
                                                            {address.postalCode && ` - ${address.postalCode}`}
                                                        </p>
                                                    </div>
                                                    {selectedAddressId === address._id && (
                                                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    /* Manual address form for guest users or users without saved addresses */
                                    <div className="space-y-4">
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="addressFullName">Recipient Name *</Label>
                                                <Input
                                                    id="addressFullName"
                                                    name="fullName"
                                                    value={shippingAddress.fullName}
                                                    onChange={handleShippingAddressChange}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="phone">Phone Number *</Label>
                                                <Input
                                                    id="phone"
                                                    name="phone"
                                                    type="tel"
                                                    placeholder="+84 xxx xxx xxx"
                                                    value={shippingAddress.phone}
                                                    onChange={handleShippingAddressChange}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="addressLine1">Address Line 1 *</Label>
                                            <Input
                                                id="addressLine1"
                                                name="addressLine1"
                                                placeholder="Street address, P.O. box"
                                                value={shippingAddress.addressLine1}
                                                onChange={handleShippingAddressChange}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="addressLine2">Address Line 2</Label>
                                            <Input
                                                id="addressLine2"
                                                name="addressLine2"
                                                placeholder="Apartment, suite, unit, building"
                                                value={shippingAddress.addressLine2}
                                                onChange={handleShippingAddressChange}
                                            />
                                        </div>

                                        <div className="grid sm:grid-cols-3 gap-4">
                                            <div>
                                                <Label htmlFor="ward">Ward *</Label>
                                                <Input
                                                    id="ward"
                                                    name="ward"
                                                    value={shippingAddress.ward}
                                                    onChange={handleShippingAddressChange}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="district">District *</Label>
                                                <Input
                                                    id="district"
                                                    name="district"
                                                    value={shippingAddress.district}
                                                    onChange={handleShippingAddressChange}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="city">City *</Label>
                                                <Input
                                                    id="city"
                                                    name="city"
                                                    value={shippingAddress.city}
                                                    onChange={handleShippingAddressChange}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="postalCode">Postal Code</Label>
                                            <Input
                                                id="postalCode"
                                                name="postalCode"
                                                value={shippingAddress.postalCode}
                                                onChange={handleShippingAddressChange}
                                            />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Payment Method */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Payment Method
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {PAYMENT_METHODS.map((method) => {
                                    const Icon = method.icon;
                                    return (
                                        <div
                                            key={method.id}
                                            onClick={() => setPaymentMethod(method.id)}
                                            className={`p-4 border rounded-lg cursor-pointer transition ${paymentMethod === method.id
                                                ? 'border-primary bg-primary/5'
                                                : 'hover:border-primary/50'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Icon className="h-5 w-5" />
                                                    <p className="font-medium">{method.label}</p>
                                                </div>
                                                {paymentMethod === method.id && (
                                                    <CheckCircle className="h-5 w-5 text-primary" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* Order Note */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Order Note (Optional)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    placeholder="Add any special instructions for your order..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    rows={3}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Order Summary */}
                    <div>
                        <Card className="sticky top-4">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingBag className="h-5 w-5" />
                                    Order Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Items */}
                                <div className="space-y-3 max-h-60 overflow-y-auto">
                                    {items.map((item) => {

                                        let price = item.variant
                                            ? item.product.basePrice + (item.variant.priceAdjustment || 0)
                                            : item.product.basePrice;

                                        if (item.product.discount) {
                                            price = Math.max(price * (1 - item.product.discount / 100), 0);
                                        }

                                        return (
                                            <div
                                                key={`${item.product._id}-${item.variant?._id}`}
                                                className="flex gap-3"
                                            >
                                                <img
                                                    src={item.product.images?.[0]?.url || '/placeholder.jpg'}
                                                    alt={item.product.name}
                                                    className="w-16 h-16 object-cover rounded"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">
                                                        {item.product.name}
                                                    </p>
                                                    {item.variant && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {item.variant.name}
                                                        </p>
                                                    )}
                                                    <p className="text-sm">
                                                        {price.toLocaleString('vi-VN')} ₫ × {item.quantity}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <Separator />

                                {/* Discount Code */}
                                <div>
                                    <Label className="flex items-center gap-2 mb-2">
                                        <Tag className="h-4 w-4" />
                                        Discount Code
                                    </Label>
                                    {!appliedDiscount ? (
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Enter code"
                                                value={discountCode}
                                                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                                maxLength={10}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleValidateDiscount}
                                                disabled={validatingDiscount || !discountCode.trim()}
                                            >
                                                {validatingDiscount ? 'Validating...' : 'Apply'}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                            <div>
                                                <Badge variant="secondary" className="mb-1">
                                                    {appliedDiscount.code}
                                                </Badge>
                                                <p className="text-sm text-green-700">
                                                    -{appliedDiscount.discountAmount.toLocaleString('vi-VN')} ₫
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleRemoveDiscount}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Loyalty Points - Only for logged-in users */}
                                {isAuthenticated && user?.loyaltyPoints > 0 && (
                                    <div>
                                        <Label className="mb-2 block">
                                            Use Loyalty Points (Available: {user.loyaltyPoints})
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                max={maxLoyaltyPoints}
                                                value={loyaltyPointsUsed}
                                                onChange={handleLoyaltyPointsChange}
                                                placeholder="0"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setLoyaltyPointsUsed(maxLoyaltyPoints)}
                                            >
                                                Use Max
                                            </Button>
                                        </div>
                                        {loyaltyPointsUsed > 0 && (
                                            <p className="text-sm text-green-600 mt-1">
                                                -{loyaltyDiscount.toLocaleString('vi-VN')} ₫
                                            </p>
                                        )}
                                    </div>
                                )}

                                <Separator />

                                {/* Totals */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>{subtotal.toLocaleString('vi-VN')} ₫</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Shipping</span>
                                        <span>
                                            {shippingFee === 0
                                                ? <span className="text-green-600 font-medium">FREE</span>
                                                : `${shippingFee.toLocaleString('vi-VN')} ₫`
                                            }
                                        </span>
                                    </div>
                                    {subtotal < SHIPPING_THRESHOLD && (
                                        <p className="text-xs text-muted-foreground">
                                            Add {(SHIPPING_THRESHOLD - subtotal).toLocaleString('vi-VN')} ₫ more for free shipping
                                        </p>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Tax (10%)</span>
                                        <span>{taxAmount.toLocaleString('vi-VN')} ₫</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span>Discount</span>
                                            <span>-{discountAmount.toLocaleString('vi-VN')} ₫</span>
                                        </div>
                                    )}
                                    {loyaltyDiscount > 0 && (
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span>Loyalty Points</span>
                                            <span>-{loyaltyDiscount.toLocaleString('vi-VN')} ₫</span>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                <div className="flex justify-between">
                                    <span className="text-lg font-bold">Total</span>
                                    <span className="text-2xl font-bold text-primary">
                                        {total.toLocaleString('vi-VN')} ₫
                                    </span>
                                </div>

                                {/* Earn Points - Only for logged-in users */}
                                {isAuthenticated && (
                                    <div className="bg-muted p-3 rounded-lg text-sm">
                                        <p className="font-medium mb-1">Earn Loyalty Points!</p>
                                        <p className="text-muted-foreground">
                                            You'll earn {Math.floor(total * 0.0001)} points with this order
                                        </p>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full"
                                    size="lg"
                                    disabled={loading || (isAuthenticated && user?.addresses?.length > 0 && !selectedAddressId)}
                                >
                                    {loading ? 'Processing...' : 'Place Order'}
                                </Button>

                                <p className="text-xs text-center text-muted-foreground">
                                    By placing your order, you agree to our terms and conditions
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>

            {/* Add Address Dialog - Only for logged-in users */}
            {isAuthenticated && (
                <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add Shipping Address</DialogTitle>
                            <DialogDescription>
                                Add a new delivery address to your account
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleAddNewAddress} className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="newFullName">Full Name *</Label>
                                    <Input
                                        id="newFullName"
                                        name="fullName"
                                        value={newAddress.fullName}
                                        onChange={handleAddressChange}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="newPhone">Phone *</Label>
                                    <Input
                                        id="newPhone"
                                        name="phone"
                                        type="tel"
                                        value={newAddress.phone}
                                        onChange={handleAddressChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="newAddressLine1">Address Line 1 *</Label>
                                <Input
                                    id="newAddressLine1"
                                    name="addressLine1"
                                    placeholder="Street address, P.O. box"
                                    value={newAddress.addressLine1}
                                    onChange={handleAddressChange}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="newAddressLine2">Address Line 2</Label>
                                <Input
                                    id="newAddressLine2"
                                    name="addressLine2"
                                    placeholder="Apartment, suite, unit, building"
                                    value={newAddress.addressLine2}
                                    onChange={handleAddressChange}
                                />
                            </div>

                            <div className="grid sm:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="newWard">Ward *</Label>
                                    <Input
                                        id="newWard"
                                        name="ward"
                                        value={newAddress.ward}
                                        onChange={handleAddressChange}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="newDistrict">District *</Label>
                                    <Input
                                        id="newDistrict"
                                        name="district"
                                        value={newAddress.district}
                                        onChange={handleAddressChange}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="newCity">City *</Label>
                                    <Input
                                        id="newCity"
                                        name="city"
                                        value={newAddress.city}
                                        onChange={handleAddressChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="newPostalCode">Postal Code</Label>
                                <Input
                                    id="newPostalCode"
                                    name="postalCode"
                                    value={newAddress.postalCode}
                                    onChange={handleAddressChange}
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="newIsDefault"
                                    checked={newAddress.isDefault}
                                    onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <Label htmlFor="newIsDefault" className="cursor-pointer">
                                    Set as default address
                                </Label>
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setShowAddressDialog(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Adding...' : 'Add Address'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}