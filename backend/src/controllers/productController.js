const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Review = require('../models/Review');
const mongoose = require('mongoose');


class ProductController {
  constructor() {
    this.getProducts = this.getProducts.bind(this);
    this.getProductBySlug = this.getProductBySlug.bind(this);
    this.getRelatedProducts = this.getRelatedProducts.bind(this);
    this.getCategories = this.getCategories.bind(this);
    this.getBrands = this.getBrands.bind(this);
    this.getAllProducts = this.getAllProducts.bind(this);
    this.getProductById = this.getProductById.bind(this);
  }
  // Get all products with filters
  async getProducts(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        brand,
        minPrice,
        maxPrice,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        featured,
        new: isNew,
        bestseller
      } = req.query;

      // Build query
      const query = { status: 'active' };

      if (category) query.categoryId = category;
      if (brand) query.brandId = brand;

      if (minPrice || maxPrice) {
        query.basePrice = {};
        if (minPrice) query.basePrice.$gte = parseFloat(minPrice);
        if (maxPrice) query.basePrice.$lte = parseFloat(maxPrice);
      }

      if (featured === 'true') query.isFeatured = true;
      if (isNew === 'true') query.isNew = true;
      if (bestseller === 'true') query.isBestseller = true;

      // Text search
      if (search) {
        query.$text = { $search: search };
      }

      // Sort
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Pagination
      const skip = (page - 1) * limit;

      // Execute query
      const [products, total] = await Promise.all([
        Product.find(query)
          .populate('categoryId', 'name slug')
          .populate('brandId', 'name slug')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Product.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          products,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get product by slug
  async getProductBySlug(req, res, next) {
    try {
      const { slug } = req.params;

      const product = await Product.findOne({ slug })
        .populate('categoryId', 'name slug')
        .populate('brandId', 'name slug logo');

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Increment view count
      product.viewCount += 1;
      await product.save();

      res.json({
        success: true,
        data: { product }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get related products
  async getRelatedProducts(req, res, next) {
    try {
      const { productId } = req.params;
      const limit = parseInt(req.query.limit) || 8;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const relatedProducts = await Product.find({
        _id: { $ne: productId },
        categoryId: product.categoryId,
        status: 'active'
      })
        .limit(limit)
        .select('name slug basePrice images averageRating reviewCount')
        .lean();

      res.json({
        success: true,
        data: { products: relatedProducts }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get categories
  async getCategories(req, res, next) {
    try {
      const categories = await Category.find({ isActive: true })
        .sort({ displayOrder: 1 })
        .lean();

      res.json({
        success: true,
        data: { categories }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get brands
  async getBrands(req, res, next) {
    try {
      const brands = await Brand.find({ isActive: true })
        .sort({ name: 1 })
        .lean();

      res.json({
        success: true,
        data: { brands }
      });
    } catch (error) {
      next(error);
    }
  }

  // adminController.js hoặc productController.js
  async getAllProducts(req, res, next) {
    try {
      const {
        page = 1,
        limit = 12,
        search,
        category,
        sortBy = 'createdAt',
        order = 'desc',
        brands,
        categories,
        minPrice,
        maxPrice
      } = req.query;

      const query = {};

      // ✅ Search
      if (search) {
        query.$text = { $search: search };
      }

      // ✅ Filter by category name/slug (phải convert sang ObjectId)
      if (category) {
        const cat = await Category.findOne({
          $or: [
            { slug: category.toLowerCase() },
            { name: new RegExp(category, 'i') }
          ]
        });
        if (cat) {
          query.categoryId = cat._id;
        }
      }

      // ✅ Filter by multiple categories (từ checkbox)
      if (categories && categories.length > 0) {
        const categoryArray = Array.isArray(categories) ? categories : [categories];
        const cats = await Category.find({
          $or: [
            { slug: { $in: categoryArray.map(c => c.toLowerCase()) } },
            { name: { $in: categoryArray.map(c => new RegExp(c, 'i')) } }
          ]
        });
        if (cats.length > 0) {
          query.categoryId = { $in: cats.map(c => c._id) };
        }
      }

      // ✅ Filter by multiple brands
      if (brands && brands.length > 0) {
        const brandArray = Array.isArray(brands) ? brands : [brands];
        const brandsData = await Brand.find({
          $or: [
            { slug: { $in: brandArray.map(b => b.toLowerCase()) } },
            { name: { $in: brandArray.map(b => new RegExp(b, 'i')) } }
          ]
        });
        if (brandsData.length > 0) {
          query.brandId = { $in: brandsData.map(b => b._id) };
        }
      }

      // ✅ Filter by price
      if (minPrice || maxPrice) {
        query.basePrice = {};
        if (minPrice) query.basePrice.$gte = Number(minPrice);
        if (maxPrice) query.basePrice.$lte = Number(maxPrice);
      }

      // ✅ Sort
      const sortOrder = order === 'asc' ? 1 : -1;
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder;

      // Aggregation with finalPrice
      const products = await Product.aggregate([
        { $match: query },

        // Populate categoryId
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "categoryId"
          }
        },
        { $unwind: { path: "$categoryId", preserveNullAndEmptyArrays: true } },

        // Populate brandId
        {
          $lookup: {
            from: "brands",
            localField: "brandId",
            foreignField: "_id",
            as: "brandId"
          }
        },
        { $unwind: { path: "$brandId", preserveNullAndEmptyArrays: true } },

        // Add finalPrice
        {
          $addFields: {
            finalPrice: {
              $multiply: [
                "$basePrice",
                { $subtract: [1, { $divide: ["$discount", 100] }] }
              ]
            }
          }
        },

        // Sort by finalPrice hoặc sortBy FE gửi
        {
          $sort: {
            [sortBy === 'price' ? 'finalPrice' : sortBy]: sortOrder
          }
        },

        // Pagination
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) }
      ]);

      const count = await Product.countDocuments(query);

      res.json({
        success: true,
        data: {
          products: products.map(p => ({
            ...p,
            id: p._id,
            price: p.basePrice,
            category: p.categoryId?.name,
            brand: p.brandId?.name,
            // Add other mappings if needed
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: count,
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // async getAllProducts(req, res, next) {
  //   try {
  //     const {
  //       page = 1,
  //       limit = 12,
  //       search,
  //       category,
  //       sortBy = 'createdAt',
  //       order = 'desc',
  //       brands,
  //       categories,
  //       minPrice,
  //       maxPrice
  //     } = req.query;

  //     const query = {};

  //     // ✅ Search
  //     if (search) {
  //       query.$text = { $search: search };
  //     }

  //     // ✅ Filter by category name/slug (phải convert sang ObjectId)
  //     if (category) {
  //       const cat = await Category.findOne({
  //         $or: [
  //           { slug: category.toLowerCase() },
  //           { name: new RegExp(category, 'i') }
  //         ]
  //       });
  //       if (cat) {
  //         query.categoryId = cat._id;
  //       }
  //     }

  //     // ✅ Filter by multiple categories (từ checkbox)
  //     if (categories && categories.length > 0) {
  //       const categoryArray = Array.isArray(categories) ? categories : [categories];
  //       const cats = await Category.find({
  //         $or: [
  //           { slug: { $in: categoryArray.map(c => c.toLowerCase()) } },
  //           { name: { $in: categoryArray.map(c => new RegExp(c, 'i')) } }
  //         ]
  //       });
  //       if (cats.length > 0) {
  //         query.categoryId = { $in: cats.map(c => c._id) };
  //       }
  //     }

  //     // ✅ Filter by multiple brands
  //     if (brands && brands.length > 0) {
  //       const brandArray = Array.isArray(brands) ? brands : [brands];
  //       const brandsData = await Brand.find({
  //         $or: [
  //           { slug: { $in: brandArray.map(b => b.toLowerCase()) } },
  //           { name: { $in: brandArray.map(b => new RegExp(b, 'i')) } }
  //         ]
  //       });
  //       if (brandsData.length > 0) {
  //         query.brandId = { $in: brandsData.map(b => b._id) };
  //       }
  //     }

  //     // ✅ Filter by price
  //     if (minPrice || maxPrice) {
  //       query.basePrice = {};
  //       if (minPrice) query.basePrice.$gte = Number(minPrice);
  //       if (maxPrice) query.basePrice.$lte = Number(maxPrice);
  //     }

  //     // ✅ Sort
  //     const sortOrder = order === 'asc' ? 1 : -1;
  //     const sortOptions = {};
  //     sortOptions[sortBy] = sortOrder;

  //     // Execute query
  //     const products = await Product.find(query)
  //       .populate('categoryId', 'name slug')
  //       .populate('brandId', 'name slug logoUrl')
  //       .sort(sortOptions)
  //       .limit(limit * 1)
  //       .skip((page - 1) * limit)
  //       .lean();

  //     const count = await Product.countDocuments(query);

  //     res.json({
  //       success: true,
  //       data: {
  //         products: products.map(p => ({
  //           ...p,
  //           id: p._id,
  //           price: p.basePrice,
  //           category: p.categoryId?.name,
  //           brand: p.brandId?.name,
  //           // Add other mappings if needed
  //         })),
  //         pagination: {
  //           page: Number(page),
  //           limit: Number(limit),
  //           total: count,
  //           pages: Math.ceil(count / limit)
  //         }
  //       }
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // };


  // productController.js
  async getProductById(req, res, next) {
    try {
      const { id } = req.params;

      // ✅ Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID'
        });
      }

      // ✅ Fetch product with populated data
      const product = await Product.findById(id)
        .populate('categoryId', 'name slug description imageUrl')
        .populate('brandId', 'name slug logoUrl description websiteUrl')
        .lean(); // ✅ Better performance

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // ✅ Increment view count (async, không block response)
      Product.findByIdAndUpdate(
        id,
        { $inc: { viewCount: 1 } },
        { new: false }
      ).exec().catch(err => console.error('View count update failed:', err));

      // ✅ Fetch review stats
      const reviewStats = await Review.aggregate([
        {
          $match: {
            productId: new mongoose.Types.ObjectId(id),
            status: 'approved'
          }
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 },
            ratingDistribution: {
              $push: '$rating'
            }
          }
        }
      ]);

      // ✅ Calculate rating distribution
      let ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      if (reviewStats.length > 0) {
        reviewStats[0].ratingDistribution.forEach(rating => {
          ratingBreakdown[rating]++;
        });
      }

      // ✅ Response with enriched data
      res.json({
        success: true,
        data: {
          ...product,
          // Override with real-time stats
          averageRating: reviewStats.length > 0
            ? Math.round(reviewStats[0].averageRating * 10) / 10
            : 0,
          reviewCount: reviewStats.length > 0 ? reviewStats[0].reviewCount : 0,
          ratingBreakdown,
          // Add computed fields
          finalPrice: product.basePrice * (1 - (product.discount || 0) / 100),
          inStock: product.variants?.some(v => v.stockQuantity > 0) || false,
          category: product.categoryId,
          brand: product.brandId
        }
      });
    } catch (error) {
      console.error('Get product by ID error:', error);
      next(error);
    }
  }

}

module.exports = new ProductController();
