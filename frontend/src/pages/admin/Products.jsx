import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Search, Image as ImageIcon, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    DialogDescription,
    DialogFooter,
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { productAPI, adminAPI } from '@/services/api';
import { toast } from 'sonner';

export default function AdminProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDialog, setShowDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [uploadingImages, setUploadingImages] = useState({});
    const fileInputRefs = useRef([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
    });
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        shortDescription: '',
        price: '',
        discount: 0,
        category: '',
        brand: '',
        images: ['', '', ''],
        variants: [
            { name: 'Standard', price: '', stock: '' },
            { name: 'Premium', price: '', stock: '' },
        ],
        isNew: false,
        isBestSeller: false,
    });



    useEffect(() => {
        fetchProducts();
    }, [pagination.page]);

    function getFieldValues(items, field = 'name') {
        if (!Array.isArray(items)) return [];
        return items.map(item => item[field]);
    }

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const [productRes, categoriesRes, brandsRes] = await Promise.all([
                adminAPI.getAll({
                    page: pagination.page,
                    limit: pagination.limit
                }),
                productAPI.getCategories(),
                productAPI.getBrands(),
            ]);

            setProducts(productRes.data.data.products || []);
            setPagination(prev => ({
                ...prev,
                total: productRes.data.data.pagination.total,
                pages: productRes.data.data.pagination.pages
            }));
            setCategories(getFieldValues(categoriesRes.data.data.categories) || []);
            setBrands(getFieldValues(brandsRes.data.data.brands) || []);

        } catch (error) {
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (product = null) => {
        if (product) {
            setSelectedProduct(product);
            setFormData({
                name: product.name,
                description: product.description,
                shortDescription: product.shortDescription,
                price: product.price,
                discount: product.discount || 0,
                category: product.category,
                brand: product.brand,
                images: product.images?.length >= 3 ? product.images : [...(product.images || []), '', '', ''].slice(0, 3),
                variants: product.variants?.map(v => ({
                    id: v.id,
                    name: v.name,
                    price: v.price,
                    stock: v.stock,
                    attributes: v.attributes || {}
                })) || [
                        { name: 'Standard', price: '', stock: '' },
                        { name: 'Premium', price: '', stock: '' },
                    ],
                isNew: product.isNew || false,
                isBestSeller: product.isBestSeller || false,
            });
        } else {
            setSelectedProduct(null);
            setFormData({
                name: '',
                description: '',
                shortDescription: '',
                price: '',
                discount: 0,
                category: '',
                brand: '',
                images: ['', '', ''],
                variants: [
                    { name: 'Standard', price: '', stock: '' },
                    { name: 'Premium', price: '', stock: '' },
                ],
                isNew: false,
                isBestSeller: false,
            });
        }
        setUploadingImages({});
        setShowDialog(true);
    };

    const handleImageUpload = async (index, file) => {
        if (!file) {
            toast.error('No file selected');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        try {
            setUploadingImages(prev => ({ ...prev, [index]: true }));

            // Create FormData with a different variable name to avoid confusion
            const uploadFormData = new FormData();
            uploadFormData.append('image', file);


            // Call backend upload API
            const response = await adminAPI.uploadImage(uploadFormData);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Upload failed');
            }

            const imageUrl = response.data.data.url;

            // Update the images array with the uploaded URL
            setFormData(prev => {
                const newImages = [...prev.images];
                newImages[index] = imageUrl;
                return { ...prev, images: newImages };
            });

            // Reset file input
            if (fileInputRefs.current[index]) {
                fileInputRefs.current[index].value = '';
            }

            toast.success('Image uploaded successfully!');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to upload image');
        } finally {
            setUploadingImages(prev => ({ ...prev, [index]: false }));
        }
    };

    const handleRemoveImage = (index) => {
        setFormData(prev => {
            const newImages = [...prev.images];
            newImages[index] = '';
            return { ...prev, images: newImages };
        });

        // Reset file input
        if (fileInputRefs.current[index]) {
            fileInputRefs.current[index].value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate brand and category
        if (!formData.brand) {
            toast.error('Please select a brand');
            return;
        }

        if (!formData.category) {
            toast.error('Please select a category');
            return;
        }

        // Validate at least 3 images
        const validImages = formData.images.filter(img => img.trim() !== '');
        if (validImages.length < 3) {
            toast.error('Please upload at least 3 images');
            return;
        }

        // Validate variants
        if (formData.variants.length < 2) {
            toast.error('Please add at least 2 variants');
            return;
        }

        try {
            const productData = {
                ...formData,
                price: parseFloat(formData.price),
                discount: parseInt(formData.discount),
                variants: formData.variants.map(v => ({
                    id: v.id,
                    name: v.name,
                    price: parseFloat(v.price),
                    stock: parseInt(v.stock),
                    attributes: v.attributes || {}
                })),
                images: validImages,
            };

            if (selectedProduct) {
                await adminAPI.updateProduct(selectedProduct.id, productData);
                toast.success('Product updated successfully!');
            } else {
                await adminAPI.createProduct(productData);
                toast.success('Product created successfully!');
            }

            setShowDialog(false);
            fetchProducts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save product');
        }
    };

    const handleDelete = async () => {
        try {
            await adminAPI.deleteProduct(selectedProduct.id);
            toast.success('Product deleted successfully!');
            setShowDeleteDialog(false);

            if (products.length === 1 && pagination.page > 1) {
                setPagination(prev => ({ ...prev, page: prev.page - 1 }));
            } else {
                fetchProducts();
            }
        } catch (error) {
            toast.error('Failed to delete product');
        }
    };

    const handleVariantChange = (index, field, value) => {
        const newVariants = [...formData.variants];
        newVariants[index] = {
            ...newVariants[index],
            [field]: value
        };
        setFormData({ ...formData, variants: newVariants });
    };

    const addVariant = () => {
        setFormData({
            ...formData,
            variants: [...formData.variants, { name: '', price: '', stock: '', attributes: {} }],
        });
    };

    const removeVariant = (index) => {
        const newVariants = formData.variants.filter((_, i) => i !== index);
        setFormData({ ...formData, variants: newVariants });
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Products</h1>
                    <p className="text-muted-foreground">
                        Manage your product catalog ({pagination.total} total)
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                </Button>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="p-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Brand</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Variants</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        Loading products...
                                    </TableCell>
                                </TableRow>
                            ) : filteredProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        No products found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProducts.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={product.images?.[0] || 'https://dlcdnwebimgs.asus.com/files/media/69c52e00-bea3-4e79-8344-3690f8cc94f2/v1/assets/image/proart/article_img_01.jpg'}
                                                    alt={product.name}
                                                    className="w-12 h-12 object-cover rounded"
                                                />
                                                <div>
                                                    <p className="font-medium">{product.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {product.shortDescription?.slice(0, 50)}...
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{product.category}</TableCell>
                                        <TableCell>{product.brand}</TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">${product.price}</p>
                                                {product.discount > 0 && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        -{product.discount}%
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{product.variants?.length || 0}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                {product.isNew && (
                                                    <Badge variant="secondary">New</Badge>
                                                )}
                                                {product.isBestSeller && (
                                                    <Badge>Best Seller</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenDialog(product)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setSelectedProduct(product);
                                                        setShowDeleteDialog(true);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {!loading && pagination.pages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t">
                            <div className="text-sm text-muted-foreground">
                                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                >
                                    Previous
                                </Button>

                                <div className="flex items-center gap-1">
                                    {[...Array(pagination.pages)].map((_, i) => {
                                        const page = i + 1;
                                        if (
                                            page === 1 ||
                                            page === pagination.pages ||
                                            (page >= pagination.page - 1 && page <= pagination.page + 1)
                                        ) {
                                            return (
                                                <Button
                                                    key={page}
                                                    variant={page === pagination.page ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => handlePageChange(page)}
                                                    className="w-10"
                                                >
                                                    {page}
                                                </Button>
                                            );
                                        } else if (
                                            page === pagination.page - 2 ||
                                            page === pagination.page + 2
                                        ) {
                                            return <span key={page} className="px-2">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.pages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedProduct ? 'Edit Product' : 'Add New Product'}
                        </DialogTitle>
                        <DialogDescription>
                            Fill in the product details below
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Product Name *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="brand">Brand *</Label>
                                    <Select
                                        value={formData.brand}
                                        onValueChange={(value) => setFormData({ ...formData, brand: value })}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select brand" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {brands.map((brand) => (
                                                <SelectItem key={brand} value={brand}>
                                                    {brand}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category *</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="price">Base Price *</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="discount">Discount (%)</Label>
                                    <Input
                                        id="discount"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.discount}
                                        onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="shortDescription">Short Description *</Label>
                                <Textarea
                                    id="shortDescription"
                                    value={formData.shortDescription}
                                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                                    rows={2}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Full Description *</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                    required
                                />
                            </div>
                        </div>

                        {/* Images Upload */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" />
                                <Label>Product Images * (Min 3 required)</Label>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {formData.images.map((image, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="relative border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors">
                                            {image ? (
                                                <div className="relative aspect-square">
                                                    <img
                                                        src={image}
                                                        alt={`Product ${index + 1}`}
                                                        className="w-full h-full object-cover rounded"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute top-2 right-2 h-6 w-6"
                                                        onClick={() => handleRemoveImage(index)}
                                                        disabled={uploadingImages[index]}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center justify-center aspect-square cursor-pointer">
                                                    <input
                                                        ref={(el) => (fileInputRefs.current[index] = el)}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                handleImageUpload(index, file);
                                                            }
                                                        }}
                                                        disabled={uploadingImages[index]}
                                                    />
                                                    {uploadingImages[index] ? (
                                                        <div className="text-center">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                                            <p className="text-sm text-muted-foreground">Uploading...</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                                            <p className="text-sm text-muted-foreground text-center">
                                                                Click to upload<br />
                                                                <span className="text-xs">Max 5MB</span>
                                                            </p>
                                                        </>
                                                    )}
                                                </label>
                                            )}
                                        </div>
                                        <p className="text-xs text-center text-muted-foreground">
                                            Image {index + 1}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setFormData({ ...formData, images: [...formData.images, ''] })}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add More Images
                            </Button>
                        </div>

                        {/* Variants */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Product Variants (Min 2 required)</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Variant
                                </Button>
                            </div>
                            {formData.variants.map((variant, index) => (
                                <Card key={index}>
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Variant Name</Label>
                                                <Input
                                                    placeholder="e.g., 16GB RAM"
                                                    value={variant.name}
                                                    onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Price</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={variant.price}
                                                    onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Stock</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="number"
                                                        value={variant.stock}
                                                        onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                                                        required
                                                    />
                                                    {formData.variants.length > 2 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeVariant(index)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Status Flags */}
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isNew}
                                    onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <span>Mark as New</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isBestSeller}
                                    onChange={(e) => setFormData({ ...formData, isBestSeller: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <span>Mark as Best Seller</span>
                            </label>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {selectedProduct ? 'Update Product' : 'Create Product'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the product "{selectedProduct?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}