import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Heart } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';

export default function ProductCard({ product }) {
    const { addItem } = useCartStore();

    const handleAddToCart = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const defaultVariant = product.variants?.[0];

        await addItem(product, defaultVariant, 1);
        toast.success('Added to cart!');
    };

    const averageRating = product?.averageRating || 0;
    const reviewCount = product?.reviewCount || 4;
    const hasDiscount = product.discount > 0;
    const discountedPrice = hasDiscount
        ? product.price * (1 - product.discount / 100)
        : product.price;

    return (
        <Link to={`/products/${product._id || product.id}`}>
            <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
                <div className="relative overflow-hidden aspect-square">
                    <img
                        src={product.images?.[0]?.url || 'https://cdn.britannica.com/77/170477-050-1C747EE3/Laptop-computer.jpg'}
                        alt={product.name}
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                    />
                    {hasDiscount && (
                        <Badge className="absolute top-2 left-2 bg-red-500">
                            -{product.discount}%
                        </Badge>
                    )}
                    {product.isNew && (
                        <Badge className="absolute top-2 right-2 bg-green-500">
                            New
                        </Badge>
                    )}
                    <Button
                        size="icon"
                        variant="secondary"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <Heart className="h-4 w-4" />
                    </Button>
                </div>

                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold line-clamp-2 flex-1 group-hover:text-primary transition-colors">
                            {product.name}
                        </h3>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {product.shortDescription}
                    </p>

                    <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                className={`h-4 w-4 ${i < Math.floor(averageRating)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                    }`}
                            />
                        ))}
                        <span className="text-sm text-muted-foreground ml-1">
                            ({reviewCount})
                        </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-primary">
                            {discountedPrice != null
                                ? discountedPrice.toLocaleString('vi-VN') + '₫'
                                : '0₫'}
                        </span>
                        {hasDiscount && (
                            <span className="text-sm text-muted-foreground line-through">
                                {product?.price != null
                                    ? product.price.toLocaleString('vi-VN') + '₫'
                                    : '0₫'}
                            </span>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="p-4 pt-0">
                    <Button
                        className="w-full"
                        onClick={handleAddToCart}
                    >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                    </Button>
                </CardFooter>
            </Card>
        </Link>
    );
}
