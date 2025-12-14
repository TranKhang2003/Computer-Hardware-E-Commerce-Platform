import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Shield, Headphones, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ProductCard from '@/components/products/ProductCard';
import { productAPI } from '@/services/api';
import { toast } from 'sonner';

const SHIPPING_THRESHOLD = Number(import.meta.env.VITE_SHIPPING_THRESHOLD || 5000000);
const SHIPPING_THRESHOLD_TEXT = `${SHIPPING_THRESHOLD.toLocaleString('vi-VN')} ₫`;

export default function Home() {
    const [newProducts, setNewProducts] = useState([]);
    const [bestSellers, setBestSellers] = useState([]);
    const [laptops, setLaptops] = useState([]);
    const [monitors, setMonitors] = useState([]);
    const [components, setComponents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const [newRes, bestRes, laptopsRes, monitorsRes, componentsRes] = await Promise.all([
                    productAPI.getAll({ isNew: true, limit: 4 }),
                    productAPI.getAll({ isBestSeller: true, limit: 4 }),
                    productAPI.getAll({ category: 'laptops', limit: 4 }),
                    productAPI.getAll({ category: 'monitors', limit: 4 }),
                    productAPI.getAll({ category: 'components', limit: 4 }),
                ]);

                setNewProducts(newRes.data.data.products || []);
                setBestSellers(bestRes.data.data.products || []);
                setLaptops(laptopsRes.data.data.products || []);
                setMonitors(monitorsRes.data.data.products || []);
                setComponents(componentsRes.data.data.products || []);
            } catch (error) {
                toast.error('Failed to load products');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const features = [
        {
            icon: Truck,
            title: 'Miễn Phí Vận Chuyển',
            description: `Cho đơn hàng từ ${SHIPPING_THRESHOLD_TEXT}`,
        },
        {
            icon: Shield,
            title: 'Thanh Toán An Toàn',
            description: '100% bảo mật',
        },
        {
            icon: Headphones,
            title: 'Hỗ Trợ 24/7',
            description: 'Tư vấn tận tâm mọi lúc',
        },
        {
            icon: RefreshCw,
            title: 'Đổi Trả Dễ Dàng',
            description: 'Chính sách đổi trả trong 30 ngày',
        },
    ];

    const ProductSection = ({ title, products, linkTo }) => (
        <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold">{title}</h2>
                <Button variant="outline" asChild>
                    <Link to={linkTo}>
                        View All <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                    <ProductCard key={product._id || product.id} product={product} />
                ))}
            </div>
        </section>
    );

    return (
        <div>
            {/* Hero Section */}
            <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                <div className="container mx-auto px-4 py-20">
                    <div className="max-w-2xl">
                        <h1 className="text-5xl font-bold mb-4">
                            Khám Phá Công Nghệ Cao Cấp
                        </h1>
                        <p className="text-xl mb-8 opacity-90">
                            Mua sắm những mẫu máy tính và linh kiện mới nhất với giá tốt nhất và chất lượng vượt trội.
                        </p>
                        <div className="flex gap-4">
                            <Button size="lg" variant="secondary" asChild>
                                <Link to="/products">Shop Now</Link>
                            </Button>
                            <Button size="lg" variant="secondary" asChild>
                                <Link to="/products?category=laptops">View Laptops</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-12 border-b">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <Card key={index}>
                                    <CardContent className="flex items-center gap-4 p-6">
                                        <div className="p-3 rounded-full bg-primary/10">
                                            <Icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{feature.title}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Products */}
            <div className="container mx-auto px-4 py-16">
                <ProductSection
                    title="New Arrivals"
                    products={newProducts}
                    linkTo="/products?isNew=true"
                />

                <ProductSection
                    title="Best Sellers"
                    products={bestSellers}
                    linkTo="/products?isBestSeller=true"
                />

                <ProductSection
                    title="Laptops"
                    products={laptops}
                    linkTo="/products?category=laptops"
                />

                <ProductSection
                    title="Monitors"
                    products={monitors}
                    linkTo="/products?category=monitors"
                />

                <ProductSection
                    title="Components"
                    products={components}
                    linkTo="/products?category=components"
                />
            </div>

            {/* CTA Section */}
            <section className="bg-muted py-16">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-4">
                        Sẵn Sàng Xây Dựng Bộ Máy Mơ Ước Của Bạn?
                    </h2>
                    <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                        Khám phá bộ sưu tập máy tính và linh kiện đa dạng của chúng tôi. Miễn phí vận chuyển cho đơn hàng từ {SHIPPING_THRESHOLD_TEXT}!
                    </p>
                    <Button size="lg" asChild>
                        <Link to="/products">Start Shopping</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
