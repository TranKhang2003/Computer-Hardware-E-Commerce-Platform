// Products.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '@/components/products/ProductCard';
import ProductFilter from '@/components/products/ProductFilter';
import ProductSort from '@/components/products/ProductSort';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { productAPI } from '@/services/api';
import { toast } from 'sonner';

export default function Products() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
    });

    const [filters, setFilters] = useState({
        brands: [],
        categories: [],
        minPrice: null,
        maxPrice: null,
    });

    const [sortBy, setSortBy] = useState('relevance');
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);

    // ✅ 1. Load brands và categories khi component mount
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [brandsRes, categoriesRes] = await Promise.all([
                    productAPI.getBrands(),
                    productAPI.getCategories(),
                ]);

                // ✅ Extract tên brands và categories
                const brandNames = brandsRes.data.data.brands.map(b => b.name);
                const categoryNames = categoriesRes.data.data.categories.map(c => c.name);

                setBrands(brandNames);
                setCategories(categoryNames);

            } catch (error) {
                console.error('❌ Failed to load metadata:', error);
                toast.error('Failed to load filters');
            }
        };
        fetchMetadata();
    }, []);

    // ✅ 2. Fetch products
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const page = parseInt(searchParams.get('page')) || 1;
                const search = searchParams.get('search') || '';
                const category = searchParams.get('category') || '';

                // ✅ Xử lý sort
                let sortByParam = 'createdAt';
                let orderParam = 'desc';

                if (sortBy && sortBy !== 'relevance') {
                    if (sortBy.includes('-')) {
                        const [field, direction] = sortBy.split('-');
                        sortByParam = field;
                        orderParam = direction;
                    } else if (sortBy === 'rating') {
                        sortByParam = 'averageRating';
                        orderParam = 'desc';
                    } else {
                        sortByParam = sortBy;
                    }
                }

                // ✅ Build params
                const params = {
                    page,
                    limit: pagination.limit,
                    sortBy: sortByParam,
                    order: orderParam,
                };

                if (search) params.search = search;
                if (category) params.category = category;

                // ✅ Thêm filters (chỉ khi có giá trị)
                if (filters.brands && filters.brands.length > 0) {
                    params.brands = filters.brands;
                }

                if (filters.categories && filters.categories.length > 0) {
                    params.categories = filters.categories;
                }

                if (filters.minPrice !== null && filters.minPrice > 0) {
                    params.minPrice = filters.minPrice;
                }

                if (filters.maxPrice !== null && filters.maxPrice < 5000) {
                    params.maxPrice = filters.maxPrice;
                }



                // ✅ Gọi API (chú ý: dùng productAPI.getAllProducts hoặc getProducts)
                const response = await productAPI.getAllProducts(params);



                setProducts(response.data.data.products || []);
                setPagination({
                    page: response.data.data.pagination.page,
                    limit: response.data.data.pagination.limit,
                    total: response.data.data.pagination.total,
                    totalPages: response.data.data.pagination.pages,
                });
            } catch (error) {
                toast.error('Failed to load products');
                console.error('❌ Error:', error.response?.data || error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [searchParams, filters, sortBy, pagination.limit]); // ✅ Thêm pagination.limit

    const handlePageChange = (newPage) => {
        setSearchParams(prev => {
            prev.set('page', newPage.toString());
            return prev;
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleFilterChange = (newFilters) => {

        setFilters(newFilters);
        setSearchParams(prev => {
            prev.set('page', '1');
            return prev;
        });
    };

    const handleSortChange = (newSort) => {

        setSortBy(newSort);
        setSearchParams(prev => {
            prev.set('page', '1');
            return prev;
        });
    };

    const renderPageNumbers = () => {
        const pages = [];
        const { page, totalPages } = pagination;

        if (page > 2) {
            pages.push(
                <PaginationItem key={1}>
                    <PaginationLink onClick={() => handlePageChange(1)}>
                        1
                    </PaginationLink>
                </PaginationItem>
            );
            if (page > 3) {
                pages.push(<span key="ellipsis1" className="px-2">...</span>);
            }
        }

        for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i++) {
            pages.push(
                <PaginationItem key={i}>
                    <PaginationLink
                        onClick={() => handlePageChange(i)}
                        isActive={i === page}
                    >
                        {i}
                    </PaginationLink>
                </PaginationItem>
            );
        }

        if (page < totalPages - 1) {
            if (page < totalPages - 2) {
                pages.push(<span key="ellipsis2" className="px-2">...</span>);
            }
            pages.push(
                <PaginationItem key={totalPages}>
                    <PaginationLink onClick={() => handlePageChange(totalPages)}>
                        {totalPages}
                    </PaginationLink>
                </PaginationItem>
            );
        }

        return pages;
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Products</h1>
                <p className="text-muted-foreground">
                    Showing {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}-
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
                </p>
            </div>

            <div className="flex gap-8">
                <ProductFilter
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    brands={brands}
                    categories={categories}
                />

                <div className="flex-1">
                    <div className="flex items-center justify-between mb-6">
                        <ProductSort value={sortBy} onChange={handleSortChange} />
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(9)].map((_, i) => (
                                <div key={i} className="space-y-3">
                                    <Skeleton className="h-64 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : products.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {products.map((product) => (
                                    <ProductCard key={product._id || product.id} product={product} />
                                ))}
                            </div>

                            {pagination.totalPages > 1 && (
                                <div className="mt-12">
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                                                    className={pagination.page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                />
                                            </PaginationItem>

                                            {renderPageNumbers()}

                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                                                    className={pagination.page === pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-xl text-muted-foreground">No products found</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Try adjusting your filters
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}