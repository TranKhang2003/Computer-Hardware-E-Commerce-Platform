// ============================================================
// OPTIMIZED ADMIN PRODUCT CONTROLLER (No Transactions)
// Technology: Node.js + Express + MongoDB
// Key Improvements:
// 1. Removed transactions for simpler setup
// 2. Proper variant merging (not replacement)
// 3. Better error handling
// 4. Optimized queries with lean()
// ============================================================

const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const StockMovement = require('../models/StockMovement');
const AdminActivityLog = require('../models/ActivityLog');
const { generateSKU, slugify } = require('../utils/helpers');
const { deleteMultipleFromS3 } = require('../services/uploadService');


class ProductController {
    constructor() {
        this.getAllProducts = this.getAllProducts.bind(this);
        this.getProductById = this.getProductById.bind(this);
        this.createProduct = this.createProduct.bind(this);
        this.updateProduct = this.updateProduct.bind(this);
        this.deleteProduct = this.deleteProduct.bind(this);
        this.bulkUpdateStatus = this.bulkUpdateStatus.bind(this);
        this.getProductStats = this.getProductStats.bind(this);
        this.exportProducts = this.exportProducts.bind(this);
    }

    safeMapToObject(data) {
        if (!data) return {};
        if (data instanceof Map) return Object.fromEntries(data);
        if (Array.isArray(data)) return Object.fromEntries(data);
        if (typeof data === 'object') return data;
        return {};
    }

    async getAllProducts(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                category = '',
                brand = '',
                status = '',
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            const filter = {};

            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { sku: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }

            if (category) {
                const categoryDoc = await Category.findOne({ slug: category }).lean();
                if (categoryDoc) filter.categoryId = categoryDoc._id;
            }

            if (brand) {
                const brandDoc = await Brand.findOne({ slug: brand }).lean();
                if (brandDoc) filter.brandId = brandDoc._id;
            }

            if (status) filter.status = status;

            const sort = {};
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Optimize with parallel queries and lean()
            const [products, total] = await Promise.all([
                Product.find(filter)
                    .populate('categoryId', 'name slug')
                    .populate('brandId', 'name slug logoUrl')
                    .sort(sort)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(),
                Product.countDocuments(filter)
            ]);

            const transformedProducts = products.map(product => ({
                id: product._id,
                sku: product.sku,
                name: product.name,
                slug: product.slug,
                description: product.description,
                shortDescription: product.shortDescription,
                category: product.categoryId?.name || 'N/A',
                categorySlug: product.categoryId?.slug,
                brand: product.brandId?.name || 'N/A',
                brandSlug: product.brandId?.slug,
                brandLogo: product.brandId?.logoUrl,
                price: product.basePrice,
                costPrice: product.costPrice,
                discount: product.discount,
                images: product.images?.map(img => img.url) || [],
                variants: product.variants?.map(v => ({
                    id: v._id,
                    sku: v.sku,
                    name: v.name,
                    attributes: this.safeMapToObject(v.attributes),
                    price: product.basePrice + (v.priceAdjustment || 0),
                    stock: v.stockQuantity,
                    lowStockThreshold: v.lowStockThreshold,
                    isActive: v.isActive
                })) || [],
                status: product.status,
                isNew: product.isNew,
                isFeatured: product.isFeatured,
                isBestSeller: product.isBestseller,
                viewCount: product.viewCount,
                soldCount: product.soldCount,
                averageRating: product.averageRating,
                reviewCount: product.reviewCount,
                specifications: this.safeMapToObject(product.specifications),
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
            }));

            res.json({
                success: true,
                data: {
                    products: transformedProducts,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / parseInt(limit))
                    }
                }
            });
        } catch (error) {
            console.error('Get all products error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch products',
                error: error.message
            });
        }
    }

    async getProductById(req, res) {
        try {
            const { id } = req.params;

            const product = await Product.findById(id)
                .populate('categoryId', 'name slug')
                .populate('brandId', 'name slug logoUrl')
                .lean();

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            const transformedProduct = {
                id: product._id,
                sku: product.sku,
                name: product.name,
                slug: product.slug,
                description: product.description,
                shortDescription: product.shortDescription,
                category: product.categoryId?.slug || '',
                brand: product.brandId?.slug || '',
                price: product.basePrice,
                costPrice: product.costPrice,
                images: product.images?.map(img => img.url) || [],
                variants: product.variants?.map(v => ({
                    id: v._id,
                    sku: v.sku,
                    name: v.name,
                    attributes: this.safeMapToObject(v.attributes),
                    price: product.basePrice + (v.priceAdjustment || 0),
                    stock: v.stockQuantity,
                    lowStockThreshold: v.lowStockThreshold,
                    imageUrl: v.imageUrl,
                    isActive: v.isActive
                })) || [],
                status: product.status,
                isNew: product.isNew,
                isFeatured: product.isFeatured,
                isBestSeller: product.isBestseller,
                specifications: this.safeMapToObject(product.specifications),
                metadata: this.safeMapToObject(product.metadata)
            };

            res.json({
                success: true,
                data: transformedProduct
            });
        } catch (error) {
            console.error('Get product by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch product',
                error: error.message
            });
        }
    }

    async createProduct(req, res) {
        try {
            const {
                name,
                description,
                shortDescription,
                category,
                brand,
                price,
                costPrice,
                discount = 0,
                images = [],
                variants = [],
                specifications = {},
                isNew = false,
                isFeatured = false,
                isBestSeller = false,
                status = 'active'
            } = req.body;

            // Validation
            if (!name || !description || !price || !category) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: name, description, price, category'
                });
            }

            if (!variants || variants.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'At least 2 variants are required'
                });
            }

            if (!images || images.length < 3) {
                return res.status(400).json({
                    success: false,
                    message: 'At least 3 images are required'
                });
            }

            // Find category and brand
            const categoryDoc = await Category.findOne({ slug: category });
            if (!categoryDoc) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            let brandDoc = null;
            if (brand) {
                brandDoc = await Brand.findOne({ slug: brand });
                if (!brandDoc) {
                    return res.status(404).json({
                        success: false,
                        message: 'Brand not found'
                    });
                }
            }

            const sku = await generateSKU(categoryDoc.name);
            const slug = slugify(name);

            const existingProduct = await Product.findOne({ slug });
            if (existingProduct) {
                return res.status(400).json({
                    success: false,
                    message: 'Product with this name already exists'
                });
            }

            const productImages = images.map((url, index) => ({
                url,
                altText: `${name} - Image ${index + 1}`,
                displayOrder: index,
                isPrimary: index === 0
            }));

            const productVariants = variants.map((variant, index) => {
                const variantSKU = `${sku}-V${(index + 1).toString().padStart(2, '0')}`;
                return {
                    sku: variantSKU,
                    name: variant.name,
                    attributes: new Map(Object.entries(variant.attributes || {})),
                    priceAdjustment: parseFloat(variant.price) - parseFloat(price),
                    stockQuantity: parseInt(variant.stock) || 0,
                    lowStockThreshold: 5,
                    imageUrl: variant.imageUrl || '',
                    isActive: true
                };
            });

            const product = new Product({
                sku,
                name,
                slug,
                description,
                shortDescription: shortDescription || description.substring(0, 200),
                categoryId: categoryDoc._id,
                brandId: brandDoc?._id,
                basePrice: parseFloat(price),
                costPrice: costPrice ? parseFloat(costPrice) : null,
                status,
                discount,
                images: productImages,
                variants: productVariants,
                isFeatured,
                isNew,
                isBestseller: isBestSeller,
                specifications: new Map(Object.entries(specifications)),
                viewCount: 0,
                soldCount: 0,
                averageRating: 0,
                reviewCount: 0
            });

            await product.save();

            // Create stock movements
            const stockMovements = product.variants
                .filter(v => v.stockQuantity > 0)
                .map(variant => ({
                    productId: product._id,
                    variantId: variant._id,
                    type: 'in',
                    quantity: variant.stockQuantity,
                    referenceType: 'manual',
                    note: 'Initial stock',
                    createdBy: req.user.id
                }));

            if (stockMovements.length > 0) {
                await StockMovement.insertMany(stockMovements);
            }

            // Log activity (fire and forget - don't block response)
            AdminActivityLog.create({
                adminId: req.user.id,
                action: 'create_product',
                entityType: 'product',
                entityId: product._id,
                newData: new Map(Object.entries(product.toObject())),
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }).catch(err => console.error('Log error:', err));

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: {
                    id: product._id,
                    sku: product.sku,
                    name: product.name,
                    slug: product.slug
                }
            });
        } catch (error) {
            console.error('Create product error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create product',
                error: error.message
            });
        }
    }


    async updateProduct(req, res) {
        try {
            const { id } = req.params;
            const {
                name,
                description,
                shortDescription,
                category,
                brand,
                price,
                discount,
                costPrice,
                images,
                variants,
                specifications,
                isNew,
                isFeatured,
                isBestSeller,
                status
            } = req.body;

            const product = await Product.findById(id);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            const oldData = product.toObject();

            // Tìm các ảnh cũ không còn trong danh sách mới
            if (images && images.length >= 3) {
                const oldImageUrls = product.images?.map(img => img.url) || [];
                const newImageUrls = images;
                const imagesToDelete = oldImageUrls.filter(url => !newImageUrls.includes(url));

                // Xóa các ảnh cũ từ S3
                if (imagesToDelete.length > 0) {
                    await deleteMultipleFromS3(imagesToDelete);
                }

                // Cập nhật ảnh mới
                product.images = images.map((url, index) => ({
                    url,
                    altText: `${product.name} - Image ${index + 1}`,
                    displayOrder: index,
                    isPrimary: index === 0
                }));
            }

            // Update category if changed
            if (category && category !== product.categoryId?.toString()) {
                const categoryDoc = await Category.findOne({ slug: category });
                if (!categoryDoc) {
                    return res.status(404).json({
                        success: false,
                        message: 'Category not found'
                    });
                }
                product.categoryId = categoryDoc._id;
            }

            // Update brand if changed
            if (brand !== undefined) {
                if (brand) {
                    const brandDoc = await Brand.findOne({ slug: brand });
                    if (!brandDoc) {
                        return res.status(404).json({
                            success: false,
                            message: 'Brand not found'
                        });
                    }
                    product.brandId = brandDoc._id;
                } else {
                    product.brandId = null;
                }
            }

            // Update basic fields
            if (name) {
                product.name = name;
                product.slug = slugify(name);
            }
            if (description) product.description = description;
            if (shortDescription) product.shortDescription = shortDescription;
            if (price) product.basePrice = parseFloat(price);
            if (costPrice !== undefined) product.costPrice = costPrice ? parseFloat(costPrice) : null;
            if (status) product.status = status;
            if (isNew !== undefined) product.isNew = isNew;
            if (isFeatured !== undefined) product.isFeatured = isFeatured;
            if (isBestSeller !== undefined) product.isBestseller = isBestSeller;
            if (discount !== undefined) product.discount = parseInt(discount);

            // CRITICAL: Proper variant merging (not replacement)
            if (variants && variants.length >= 2) {
                const existingVariantMap = new Map(
                    product.variants.map(v => [v._id.toString(), v])
                );

                const updatedVariants = [];
                const stockMovements = [];

                for (const variantData of variants) {
                    if (variantData.id && existingVariantMap.has(variantData.id)) {
                        // UPDATE existing variant
                        const existingVariant = existingVariantMap.get(variantData.id);

                        existingVariant.name = variantData.name;
                        existingVariant.attributes = new Map(
                            Object.entries(variantData.attributes || {})
                        );
                        existingVariant.priceAdjustment = parseFloat(variantData.price) - product.basePrice;

                        // Track stock changes
                        const stockDiff = parseInt(variantData.stock) - existingVariant.stockQuantity;
                        if (stockDiff !== 0) {
                            stockMovements.push({
                                productId: product._id,
                                variantId: existingVariant._id,
                                type: stockDiff > 0 ? 'in' : 'out',
                                quantity: Math.abs(stockDiff),
                                referenceType: 'adjustment',
                                note: 'Stock adjustment via product update',
                                createdBy: req.user._id
                            });
                        }

                        existingVariant.stockQuantity = parseInt(variantData.stock);
                        existingVariant.imageUrl = variantData.imageUrl || '';
                        existingVariant.isActive = variantData.isActive !== undefined ? variantData.isActive : true;

                        updatedVariants.push(existingVariant);
                        existingVariantMap.delete(variantData.id);
                    } else {
                        // ADD new variant
                        const variantSKU = `${product.sku}-V${(product.variants.length + updatedVariants.length + 1).toString().padStart(2, '0')}`;

                        const newVariant = product.variants.create({
                            sku: variantSKU,
                            name: variantData.name,
                            attributes: new Map(Object.entries(variantData.attributes || {})),
                            priceAdjustment: parseFloat(variantData.price) - product.basePrice,
                            stockQuantity: parseInt(variantData.stock) || 0,
                            lowStockThreshold: 5,
                            imageUrl: variantData.imageUrl || '',
                            isActive: true
                        });

                        product.variants.push(newVariant);
                        updatedVariants.push(newVariant);

                        if (newVariant.stockQuantity > 0) {
                            stockMovements.push({
                                productId: product._id,
                                variantId: newVariant._id,
                                type: 'in',
                                quantity: newVariant.stockQuantity,
                                referenceType: 'manual',
                                note: 'Initial stock for new variant',
                                createdBy: req.user._id
                            });
                        }
                    }
                }

                // Xóa ảnh của variants bị xóa
                if (existingVariantMap.size > 0) {
                    const deletedVariantImages = Array.from(existingVariantMap.values())
                        .filter(v => v.imageUrl)
                        .map(v => v.imageUrl);

                    if (deletedVariantImages.length > 0) {
                        await deleteMultipleFromS3(deletedVariantImages);
                    }

                }

                product.variants = updatedVariants;

                if (stockMovements.length > 0) {
                    await StockMovement.insertMany(stockMovements);
                }
            }

            // Update specifications
            if (specifications) {
                product.specifications = new Map(Object.entries(specifications));
            }

            await product.save();

            // Log admin activity (fire and forget)
            AdminActivityLog.create({
                adminId: req.user.id,
                action: 'update_product',
                entityType: 'product',
                entityId: product._id,
                oldData: new Map(Object.entries(oldData)),
                newData: new Map(Object.entries(product.toObject())),
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }).catch(err => console.error('Log error:', err));

            res.json({
                success: true,
                message: 'Product updated successfully',
                data: {
                    id: product._id,
                    name: product.name,
                    slug: product.slug
                }
            });
        } catch (error) {
            console.error('Update product error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update product',
                error: error.message
            });
        }
    }

    async deleteProduct(req, res) {
        try {
            const { id } = req.params;

            const product = await Product.findById(id);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Check if product is in any orders
            const Order = require('../models/Order');
            const ordersWithProduct = await Order.countDocuments({
                'items.productId': product._id
            });

            if (ordersWithProduct > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete product that has orders. Consider marking it as discontinued instead.'
                });
            }

            const oldData = product.toObject();

            // Xóa tất cả ảnh của product từ S3
            const imageUrls = product.images?.map(img => img.url) || [];
            if (imageUrls.length > 0) {
                await deleteMultipleFromS3(imageUrls);
            }

            // Xóa ảnh variants nếu có
            const variantImageUrls = product.variants
                ?.filter(v => v.imageUrl)
                .map(v => v.imageUrl) || [];
            if (variantImageUrls.length > 0) {
                await deleteMultipleFromS3(variantImageUrls);
            }

            await Product.findByIdAndDelete(id);
            await StockMovement.deleteMany({ productId: id });

            // Log admin activity (fire and forget)
            AdminActivityLog.create({
                adminId: req.user.id,
                action: 'delete_product',
                entityType: 'product',
                entityId: product._id,
                oldData: new Map(Object.entries(oldData)),
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }).catch(err => console.error('Log error:', err));

            res.json({
                success: true,
                message: 'Product deleted successfully'
            });
        } catch (error) {
            console.error('Delete product error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete product',
                error: error.message
            });
        }
    }

    async bulkUpdateStatus(req, res) {
        try {
            const { productIds, status } = req.body;

            if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Product IDs are required'
                });
            }

            if (!['draft', 'active', 'out_of_stock', 'discontinued'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status'
                });
            }

            const result = await Product.updateMany(
                { _id: { $in: productIds } },
                { $set: { status, updatedAt: new Date() } }
            );

            // Log admin activity (fire and forget)
            AdminActivityLog.create({
                adminId: req.user.id,
                action: 'bulk_update_product_status',
                entityType: 'product',
                newData: new Map([
                    ['productIds', productIds],
                    ['status', status],
                    ['modifiedCount', result.modifiedCount]
                ]),
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }).catch(err => console.error('Log error:', err));

            res.json({
                success: true,
                message: `${result.modifiedCount} products updated successfully`,
                data: {
                    modifiedCount: result.modifiedCount
                }
            });
        } catch (error) {
            console.error('Bulk update status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update products',
                error: error.message
            });
        }
    }

    async getProductStats(req, res) {
        try {
            const stats = await Product.aggregate([
                {
                    $facet: {
                        byStatus: [
                            {
                                $group: {
                                    _id: '$status',
                                    count: { $sum: 1 }
                                }
                            }
                        ],
                        byCategory: [
                            {
                                $group: {
                                    _id: '$categoryId',
                                    count: { $sum: 1 }
                                }
                            },
                            {
                                $lookup: {
                                    from: 'categories',
                                    localField: '_id',
                                    foreignField: '_id',
                                    as: 'category'
                                }
                            },
                            {
                                $unwind: '$category'
                            },
                            {
                                $project: {
                                    name: '$category.name',
                                    count: 1
                                }
                            },
                            { $sort: { count: -1 } },
                            { $limit: 10 }
                        ],
                        total: [
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: 1 },
                                    totalValue: { $sum: '$basePrice' },
                                    avgPrice: { $avg: '$basePrice' },
                                    avgRating: { $avg: '$averageRating' }
                                }
                            }
                        ],
                        lowStock: [
                            { $unwind: '$variants' },
                            {
                                $match: {
                                    'variants.stockQuantity': { $lte: '$variants.lowStockThreshold' },
                                    'variants.isActive': true,
                                    status: 'active'
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    count: { $sum: 1 }
                                }
                            }
                        ]
                    }
                }
            ]);

            res.json({
                success: true,
                data: stats[0]
            });
        } catch (error) {
            console.error('Get product stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch product statistics',
                error: error.message
            });
        }
    }

    async exportProducts(req, res) {
        try {
            const { category, brand, status } = req.query;

            const filter = {};
            if (category) {
                const categoryDoc = await Category.findOne({ slug: category });
                if (categoryDoc) filter.categoryId = categoryDoc._id;
            }
            if (brand) {
                const brandDoc = await Brand.findOne({ slug: brand });
                if (brandDoc) filter.brandId = brandDoc._id;
            }
            if (status) filter.status = status;

            const products = await Product.find(filter)
                .populate('categoryId', 'name')
                .populate('brandId', 'name')
                .lean();

            // Format for CSV
            const csvData = products.flatMap(product =>
                product.variants.map(variant => ({
                    SKU: variant.sku,
                    'Product Name': product.name,
                    'Variant Name': variant.name,
                    Category: product.categoryId?.name || 'N/A',
                    Brand: product.brandId?.name || 'N/A',
                    'Base Price': product.basePrice,
                    'Variant Price': product.basePrice + (variant.priceAdjustment || 0),
                    Stock: variant.stockQuantity,
                    Status: product.status,
                    'Average Rating': product.averageRating,
                    'Review Count': product.reviewCount,
                    'Sold Count': product.soldCount
                }))
            );

            res.json({
                success: true,
                data: csvData
            });
        } catch (error) {
            console.error('Export products error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export products',
                error: error.message
            });
        }
    }
}

module.exports = new ProductController();