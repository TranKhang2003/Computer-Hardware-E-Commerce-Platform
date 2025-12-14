// src/pages/ProductDetail.jsx - COMPLETE VERSION WITH COMMENTS
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Minus, Plus, Truck, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { productAPI, reviewAPI } from '@/services/api';
import { toast } from 'sonner';

// WebSocket Comments Component
import ProductCommentsWebSocket from '@/components/products/ProductCommentsWebSocket';

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { isAuthenticated, user } = useAuthStore();
    const { addItem } = useCartStore();

    const [product, setProduct] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);

    const [reviewsData, setReviewsData] = useState({
        reviews: [],
        summary: { averageRating: 0, totalReviews: 0 },
        ratingDistribution: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    });

    const [reviewText, setReviewText] = useState('');
    const [rating, setRating] = useState(5);
    const [loading, setLoading] = useState(true);
    const [submittingReview, setSubmittingReview] = useState(false);

    const fetchReviews = async () => {
        try {
            const response = await reviewAPI.getByProduct(id);
            if (response.data.success && response.data.data) {
                const { reviews, summary, ratingDistribution, pagination } = response.data.data;

                setReviewsData({
                    reviews: reviews || [],
                    summary: summary || { averageRating: 0, totalReviews: 0 },
                    ratingDistribution: ratingDistribution || [],
                    pagination: pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
                });
            }
        } catch (error) {
            console.error('Fetch reviews error:', error);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const productRes = await productAPI.getById(id);
                const productData = productRes.data.data;
                setProduct(productData);

                if (productData.variants?.length > 0) {
                    const firstAvailable = productData.variants.find(v => v.stockQuantity > 0)
                        || productData.variants[0];
                    setSelectedVariant(firstAvailable);
                }

                await fetchReviews();
            } catch (error) {
                console.error('Fetch error:', error);
                toast.error('Failed to load product');
                navigate('/products');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, navigate]);

    const handleAddToCart = async () => {
        if (!selectedVariant) {
            toast.error('Please select a variant');
            return;
        }

        if (selectedVariant.stockQuantity === 0) {
            toast.error('This variant is out of stock');
            return;
        }

        try {
            await addItem(product, selectedVariant, quantity);
            toast.success(`Added ${quantity} item(s) to cart!`);
        } catch (error) {
            console.error('Failed to add to cart:', error);
            toast.error('Failed to add to cart');
        }
    };

    const handleQuantityChange = (delta) => {
        const maxQty = selectedVariant?.stockQuantity || 999;
        const newQty = Math.max(1, Math.min(maxQty, quantity + delta));
        setQuantity(newQty);
    };

    const handleSubmitReview = async () => {
        if (!isAuthenticated) {
            toast.error('Please login to leave a review');
            navigate('/login');
            return;
        }

        if (!reviewText.trim()) {
            toast.error('Please write a review');
            return;
        }

        if (reviewText.trim().length < 10) {
            toast.error('Review must be at least 10 characters');
            return;
        }

        setSubmittingReview(true);

        try {
            await reviewAPI.create(id, {
                rating,
                comment: reviewText.trim(),
            });

            toast.success('Review submitted successfully!');
            setReviewText('');
            setRating(5);
            await fetchReviews();
        } catch (error) {
            console.error('Submit review error:', error);
            toast.error('Failed to submit review');
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-2 gap-8">
                    <div>
                        <Skeleton className="h-[500px] w-full mb-4" />
                        <div className="grid grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="h-24 w-full" />
                            ))}
                        </div>
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-12 w-1/3" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!product) return null;

    const currentPrice = selectedVariant?.priceAdjustment
        ? product.basePrice + selectedVariant.priceAdjustment
        : product.basePrice;

    const hasDiscount = product.discount > 0;

    const discountedPrice = hasDiscount
        ? currentPrice * (1 - product.discount / 100)
        : currentPrice;

    return (
        <div className="container mx-auto px-4 py-8">

            {/* PRODUCT IMAGES & INFO */}
            <div className="grid lg:grid-cols-2 gap-8 mb-12">

                {/* IMAGES */}
                <div>
                    <div className="mb-4 rounded-lg overflow-hidden border">
                        <img
                            src={product.images?.[selectedImage]?.url ||
                                'https://cdn.britannica.com/77/170477-050-1C747EE3/Laptop-computer.jpg'}
                            alt={product.images?.[selectedImage]?.altText || product.name}
                            className="w-full h-[500px] object-cover"
                        />
                    </div>

                    {product.images?.length > 1 && (
                        <div className="grid grid-cols-4 gap-4">
                            {product.images.map((image, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedImage(index)}
                                    className={`rounded-lg overflow-hidden border-2 transition-colors 
                                        ${selectedImage === index
                                            ? 'border-primary'
                                            : 'border-transparent hover:border-gray-300'}
                                    `}
                                >
                                    <img
                                        src={image.url}
                                        alt={image.altText || `${product.name} ${index + 1}`}
                                        className="w-full h-24 object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* PRODUCT DETAILS */}
                <div>
                    <div className="mb-4">
                        <Badge className="mb-2">{product.category?.name || 'Uncategorized'}</Badge>
                        <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                        <p className="text-muted-foreground">{product.brand?.name || 'Unknown Brand'}</p>
                    </div>

                    {/* RATING */}
                    <div className="flex items-center gap-2 mb-6">
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={`h-5 w-5 ${
                                        i < Math.floor(product?.averageRating || 0)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300'
                                    }`}
                                />
                            ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {product.averageRating?.toFixed(1) || '0.0'} ({product.reviewCount || 0} reviews)
                        </span>
                    </div>

                    {/* PRICE */}
                    <div className="mb-6">
                        <div className="flex items-baseline gap-3">
                            <span className="text-4xl font-bold text-primary">
                                {discountedPrice.toLocaleString('vi-VN')} ₫
                            </span>

                            {hasDiscount && (
                                <>
                                    <span className="text-xl text-muted-foreground line-through">
                                        {currentPrice.toLocaleString('vi-VN')} ₫
                                    </span>
                                    <Badge variant="destructive">-{product.discount}%</Badge>
                                </>
                            )}
                        </div>
                    </div>

                    {/* VARIANTS */}
                    {product.variants?.length > 0 && (
                        <div className="mb-6">
                            <Label className="mb-3 block">Select Variant</Label>

                            <div className="grid grid-cols-2 gap-3">
                                {product.variants.map((variant) => (
                                    <Button
                                        key={variant._id}
                                        variant={selectedVariant?._id === variant._id ? 'default' : 'outline'}
                                        onClick={() => {
                                            setSelectedVariant(variant);
                                            setQuantity(1);
                                        }}
                                        disabled={variant.stockQuantity === 0}
                                        className="justify-start h-auto py-3"
                                    >
                                        <div className="text-left w-full">
                                            <div className="font-medium">{variant.name}</div>
                                            <div className="text-sm opacity-75">
                                                {variant.stockQuantity === 0
                                                    ? 'Out of Stock'
                                                    : `Stock: ${variant.stockQuantity}`}
                                            </div>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* QUANTITY */}
                    <div className="mb-6">
                        <Label className="mb-3 block">Quantity</Label>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleQuantityChange(-1)}
                                disabled={quantity <= 1}
                            >
                                <Minus className="h-4 w-4" />
                            </Button>

                            <span className="text-xl font-medium w-12 text-center">{quantity}</span>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleQuantityChange(1)}
                                disabled={quantity >= (selectedVariant?.stockQuantity || 0)}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>

                            <span className="text-sm text-muted-foreground ml-4">
                                {selectedVariant?.stockQuantity || 0} available
                            </span>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-3 mb-8">
                        <Button
                            className="flex-1"
                            size="lg"
                            onClick={handleAddToCart}
                            disabled={!selectedVariant || selectedVariant.stockQuantity === 0}
                        >
                            <ShoppingCart className="mr-2 h-5 w-5" />
                            {selectedVariant?.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </Button>

                        <Button variant="outline" size="lg">
                            <Heart className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* FEATURES */}
                    <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center gap-3 text-sm">
                            <Truck className="h-5 w-5 text-muted-foreground" />
                            <span>Free shipping on orders over 500000đ</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <RefreshCw className="h-5 w-5 text-muted-foreground" />
                            <span>30-day easy returns</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                            <span>1-year warranty included</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS SECTION */}
            <Tabs defaultValue="description" className="mb-12">
                <TabsList className="grid w-full max-w-2xl grid-cols-3">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="reviews">Reviews ({reviewsData.summary.totalReviews})</TabsTrigger>
                    <TabsTrigger value="comments">Comments</TabsTrigger>
                </TabsList>

                {/* DESCRIPTION */}
                <TabsContent value="description" className="mt-6">
                    <Card>
                        <CardContent className="prose max-w-none p-6">
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                                {product.description ||
                                    product.shortDescription ||
                                    'No description available.'}
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* REVIEWS */}
                <TabsContent value="reviews" className="mt-6">
                    <Card className="mb-6">
                        <CardContent className="p-6">
                            <h3 className="font-semibold mb-4">Write a Review</h3>

                            {isAuthenticated ? (
                                <div className="space-y-4">
                                    <div>
                                        <Label className="mb-2 block">Rating</Label>

                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setRating(star)}
                                                    disabled={submittingReview}
                                                    className="transition-transform hover:scale-110 disabled:opacity-50"
                                                >
                                                    <Star
                                                        className={`h-6 w-6 ${
                                                            star <= rating
                                                                ? 'fill-yellow-400 text-yellow-400'
                                                                : 'text-gray-300'
                                                        }`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="review">Your Review</Label>
                                        <Textarea
                                            id="review"
                                            value={reviewText}
                                            onChange={(e) => setReviewText(e.target.value)}
                                            placeholder="Share your experience with this product... (minimum 10 characters)"
                                            rows={4}
                                            disabled={submittingReview}
                                            maxLength={2000}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {reviewText.length}/2000 characters
                                        </p>
                                    </div>

                                    <Button
                                        onClick={handleSubmitReview}
                                        disabled={submittingReview || !reviewText.trim()}
                                    >
                                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">
                                    Please{' '}
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="text-primary underline hover:no-underline"
                                    >
                                        login
                                    </button>{' '}
                                    to leave a review
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* REVIEWS LIST */}
                    {reviewsData.reviews.length > 0 ? (
                        <div className="space-y-4">
                            {reviewsData.reviews.map((review) => (
                                <Card key={review._id}>
                                    <CardContent className="p-6">
                                        <div className="flex items-start gap-4">

                                            <Avatar>
                                                <AvatarImage src={review.userId?.avatarUrl} />
                                                <AvatarFallback>
                                                    {review.userId?.fullName?.[0]?.toUpperCase() || 'U'}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <p className="font-medium">
                                                            {review.userId?.fullName || 'Anonymous'}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {new Date(review.createdAt).toLocaleDateString(
                                                                'en-US',
                                                                {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric'
                                                                }
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div className="flex">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`h-4 w-4 ${
                                                                    i < review.rating
                                                                        ? 'fill-yellow-400 text-yellow-400'
                                                                        : 'text-gray-300'
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                <p className="text-muted-foreground whitespace-pre-line">
                                                    {review.comment}
                                                </p>

                                                {review.isVerifiedPurchase && (
                                                    <Badge variant="secondary" className="mt-2">
                                                        ✓ Verified Purchase
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <p className="text-muted-foreground">
                                    No reviews yet. Be the first to review this product!
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* COMMENTS TAB */}
                <TabsContent value="comments" className="mt-6">
                    <ProductCommentsWebSocket productId={id} currentUser={user} />
                </TabsContent>

            </Tabs>
        </div>
    );
}
