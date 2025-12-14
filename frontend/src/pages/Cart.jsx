import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';

export default function Cart() {
    const navigate = useNavigate();
    const { items, removeItem, updateQuantity, getPrice, clearCart } = useCartStore();
    const subtotal = useCartStore(state => state.getSubtotal());
    const shipping = useCartStore(state => state.getShipping());
    const tax = useCartStore(state => state.getTax());
    const total = useCartStore(state => state.getTotal());


    const handleQuantityChange = async (productId, variantId, delta) => {
        const item = items.find(
            i => i.product._id === productId && i.variant?._id === variantId
        );

        if (item) {
            const newQuantity = item.quantity + delta;
            if (newQuantity > 0) {
                try {
                    await updateQuantity(productId, variantId, newQuantity);
                } catch (error) {
                    toast.error('Failed to update quantity');
                }
            }
        }
    };

    const handleRemove = async (productId, variantId) => {
        try {
            await removeItem(productId, variantId);
            toast.success('Item removed from cart');
        } catch (error) {
            toast.error('Failed to remove item');
        }
    };


    if (items.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16">
                <Card className="max-w-md mx-auto">
                    <CardContent className="p-12 text-center">
                        <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
                        <p className="text-muted-foreground mb-6">
                            Add some products to get started
                        </p>
                        <Button asChild>
                            <Link to="/products">Continue Shopping</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                    {items.map((item) => {

                        const price = getPrice(item);
                        const subtotal = price * item.quantity;

                        return (
                            <Card key={`${item.product._id}-${item.variant?._id}`}>
                                <CardContent className="p-6">
                                    <div className="flex gap-4">
                                        {/* Image */}
                                        <Link
                                            to={`/products/${item.product._id}`}
                                            className="flex-shrink-0"
                                        >
                                            <img
                                                src={item.product.images?.[0]?.url || 'https://dlcdnwebimgs.asus.com/files/media/69c52e00-bea3-4e79-8344-3690f8cc94f2/v1/assets/image/proart/article_img_01.jpg'}
                                                alt={item.product.name}
                                                className="w-24 h-24 object-cover rounded-lg"
                                            />
                                        </Link>

                                        {/* Details */}
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-2">
                                                <div>
                                                    <Link
                                                        to={`/products/${item.product._id}`}
                                                        className="font-semibold hover:text-primary transition-colors"
                                                    >
                                                        {item.product.name}
                                                    </Link>
                                                    {item.variant && (
                                                        <p className="text-sm text-muted-foreground">
                                                            Variant: {item.variant.name}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemove(item.product._id, item.variant?._id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                {/* Quantity Controls */}
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleQuantityChange(
                                                            item.product._id,
                                                            item.variant?._id,
                                                            -1
                                                        )}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <span className="w-12 text-center font-medium">
                                                        {item.quantity}
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleQuantityChange(
                                                            item.product._id,
                                                            item.variant?._id,
                                                            1
                                                        )}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>

                                                {/* Price */}
                                                <div className="text-right">
                                                    <p className="text-sm text-muted-foreground">
                                                        {/* ${price.toFixed(2)} each */}
                                                        {price.toLocaleString('vi-VN')} ₫ mỗi cái
                                                    </p>
                                                    <p className="text-lg font-bold">
                                                        {subtotal.toLocaleString('vi-VN')} ₫
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    <Button
                        variant="outline"
                        onClick={clearCart}
                        className="w-full"
                    >
                        Clear Cart
                    </Button>
                </div>

                {/* Order Summary */}
                <div>
                    <Card className="sticky top-4">
                        <CardContent className="p-6">
                            <h2 className="text-xl font-bold mb-4">Order Summary</h2>

                            <div className="space-y-3 mb-4">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-medium">{subtotal.toLocaleString('vi-VN')} ₫</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Shipping</span>
                                    <span className="font-medium">
                                        {shipping === 0 ? 'Miễn phí' : `${shipping.toLocaleString('vi-VN')} ₫`}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tax (10%)</span>
                                    <span className="font-medium">{tax.toLocaleString('vi-VN')} ₫</span>
                                </div>
                            </div>

                            <Separator className="my-4" />

                            <div className="flex justify-between mb-6">
                                <span className="text-lg font-bold">Total</span>
                                <span className="text-2xl font-bold text-primary">
                                    {total.toLocaleString('vi-VN')} ₫
                                </span>
                            </div>

                            {subtotal < 5000000  && (
                                <p className="text-sm text-muted-foreground mb-4 text-center">
                                    Thêm {(5000000 - subtotal).toLocaleString('vi-VN')} ₫ nữa để được miễn phí vận chuyển!
                                </p>
                            )}

                            <Button
                                className="w-full"
                                size="lg"
                                onClick={() => navigate('/checkout')}
                            >
                                Proceed to Checkout
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full mt-3"
                                asChild
                            >
                                <Link to="/products">Continue Shopping</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}