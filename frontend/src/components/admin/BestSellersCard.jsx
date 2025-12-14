import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

export default function BestSellersCard({ bestSellers = [], loading = false }) {
    // Helper function to extract image URL from string
    const getImageUrl = (imageStr) => {
        if (!imageStr) return 'https://via.placeholder.com/150';

        // If it's already a valid URL
        if (imageStr.startsWith('http')) return imageStr;

        // Extract URL from stringified object
        try {
            const match = imageStr.match(/url:\s*['"]([^'"]+)['"]/);
            return match ? match[1] : 'https://via.placeholder.com/150';
        } catch {
            return 'https://via.placeholder.com/150';
        }
    };

    // Empty state
    if (!loading && bestSellers.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Best Selling Products</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mb-2 opacity-50" />
                        <p>No sales data available</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Loading state
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Best Selling Products</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 animate-pulse">
                                <div className="w-8 h-8 rounded-full bg-muted" />
                                <div className="w-12 h-12 rounded bg-muted" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                </div>
                                <div className="text-right space-y-2">
                                    <div className="h-4 bg-muted rounded w-20" />
                                    <div className="h-3 bg-muted rounded w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Best Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {bestSellers.map((product, index) => (
                        <div
                            key={product._id || index}
                            className="flex items-center gap-4 hover:bg-muted/50 p-2 rounded-lg transition-colors"
                        >
                            {/* Ranking Badge */}
                            <div
                                className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-bold
                  ${index === 0 ? 'bg-yellow-100 text-yellow-700' : ''}
                  ${index === 1 ? 'bg-gray-100 text-gray-700' : ''}
                  ${index === 2 ? 'bg-orange-100 text-orange-700' : ''}
                  ${index > 2 ? 'bg-primary/10 text-primary' : ''}
                `}
                            >
                                {index + 1}
                            </div>

                            {/* Product Image with Fallback */}
                            <div className="relative w-12 h-12">
                                <img
                                    src={getImageUrl(product.image)}
                                    alt={product.name}
                                    className="w-full h-full object-cover rounded border"
                                    onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/150';
                                    }}
                                />
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{product.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {product.sold.toLocaleString()} sold
                                </p>
                            </div>

                            {/* Revenue */}
                            <div className="text-right">
                                <p className="font-bold">
                                    {(product.revenue || 0).toLocaleString('vi-VN') + '₫'}
                                </p>
                                <p className="text-sm text-muted-foreground">Revenue</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}