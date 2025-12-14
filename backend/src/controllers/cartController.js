const Cart = require('../models/Cart');
const Product = require('../models/Product');

class CartController {
  // 🔹 1. Get cart
  async getCart(req, res, next) {
    try {
      const userId = req.user?.id; // ✅ Fixed: đúng với middleware
      const cartId = req.cartId;


      let cart;

      if (userId) {
        cart = await Cart.findOne({ userId })
          .populate({
            path: 'items.productId',
            select: 'name slug basePrice images status variants discount'
          })
          .lean();
      } else {
        cart = await Cart.findOne({ cartId })
          .populate({
            path: 'items.productId',
            select: 'name slug basePrice images status variants discount'
          })
          .lean();
      }

      if (!cart) {
        // ✅ Tạo cart rỗng nếu chưa có
        cart = await Cart.create({
          userId: userId || null,
          cartId: !userId ? cartId : null,
          items: [],
          expiresAt: !userId ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null
        });

        cart = cart.toObject();
      }

      // ✅ Transform items để thêm variant info
      const transformedItems = cart.items?.map(item => {
        const product = item.productId;
        if (!product) return null;

        // Tìm variant trong product
        const variant = product.variants?.find(
          v => v._id.toString() === item.variantId.toString()
        );

        return {
          product: {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            basePrice: product.basePrice,
            images: product.images,
            status: product.status,
            discount: product.discount
          },
          variant: variant ? {
            _id: variant._id,
            name: variant.name,
            priceAdjustment: variant.priceAdjustment,
            stockQuantity: variant.stockQuantity,
            isActive: variant.isActive,
            imageUrl: variant.imageUrl
          } : null,
          quantity: item.quantity,
          priceAtAdd: item.priceAtAdd,
          addedAt: item.addedAt
        };
      }).filter(Boolean) || [];

      const subtotal = transformedItems.reduce((sum, item) => {
        return sum + (item.priceAtAdd * item.quantity);
      }, 0);

      return res.json({
        success: true,
        data: {
          items: transformedItems,
          subtotal,
          itemCount: transformedItems.length
        }
      });
    } catch (error) {
      console.error('❌ Get cart error:', error);
      next(error);
    }
  }

  // 🔹 2. Add to cart
  async addItem(req, res, next) {
    try {
      const { productId, variantId, quantity = 1 } = req.body;
      const userId = req.user?.id;
      const cartId = req.cartId;


      // Validate input
      if (!productId || !variantId) {
        return res.status(400).json({
          success: false,
          message: 'productId and variantId are required'
        });
      }

      // Validate product & variant
      const product = await Product.findById(productId);
      if (!product || product.status !== 'active') {
        return res.status(404).json({
          success: false,
          message: 'Product not found or inactive'
        });
      }

      const variant = product.variants.id(variantId);
      if (!variant || !variant.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found or inactive'
        });
      }

      // Check stock
      if (variant.stockQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock',
          availableStock: variant.stockQuantity
        });
      }

      // Find or create cart
      let cart = await Cart.findOne(
        userId ? { userId } : { cartId }
      );

      if (!cart) {
        cart = new Cart({
          userId: userId || null,
          cartId: !userId ? cartId : null,
          items: [],
          expiresAt: !userId ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null
        });
      }

      // Add item
      cart.addItem({
        productId,
        variantId,
        quantity,
        priceAtAdd: product.basePrice + (variant.priceAdjustment || 0),
        productName: product.name,
        variantName: variant.name,
        imageUrl: variant.imageUrl || product.images[0]?.url
      });



      await cart.save();


      // Populate and transform
      await cart.populate({
        path: 'items.productId',
        select: 'name slug basePrice images status variants discount'
      });

      const transformedItems = cart.items.map(item => {
        const product = item.productId;
        const variant = product.variants?.find(
          v => v._id.toString() === item.variantId.toString()
        );

        return {
          product: {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            basePrice: product.basePrice,
            images: product.images,
            status: product.status,
            discount: product.discount
          },
          variant: variant ? {
            _id: variant._id,
            name: variant.name,
            priceAdjustment: variant.priceAdjustment,
            stockQuantity: variant.stockQuantity,
            isActive: variant.isActive,
            imageUrl: variant.imageUrl
          } : null,
          quantity: item.quantity,
          priceAtAdd: item.priceAtAdd,
          addedAt: item.addedAt
        };
      });

      return res.json({
        success: true,
        message: 'Item added to cart',
        data: {
          items: transformedItems
        }
      });
    } catch (error) {
      console.error('❌ Add item error:', error);
      next(error);
    }
  }

  // 🔹 3. Update quantity
  async updateQuantity(req, res, next) {
    try {
      const { variantId, quantity } = req.body;
      const userId = req.user?.id;
      const cartId = req.cartId;


      if (!variantId || quantity === undefined) {
        return res.status(400).json({
          success: false,
          message: 'variantId and quantity are required'
        });
      }

      const cart = await Cart.findOne(
        userId ? { userId } : { cartId }
      );

      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      // Find item
      const cartItem = cart.items.find(i =>
        i.variantId.toString() === variantId.toString()
      );

      if (!cartItem) {
        return res.status(404).json({
          success: false,
          message: 'Item not found in cart'
        });
      }

      if (quantity > 0) {
        // Check stock
        const product = await Product.findById(cartItem.productId);
        const variant = product.variants.id(variantId);

        if (variant.stockQuantity < quantity) {
          return res.status(400).json({
            success: false,
            message: 'Insufficient stock',
            availableStock: variant.stockQuantity
          });
        }
      }

      cart.updateItemQuantity(variantId, quantity);
      await cart.save();

      await cart.populate({
        path: 'items.productId',
        select: 'name slug basePrice images status variants discount'
      });

      const transformedItems = cart.items.map(item => {
        const product = item.productId;
        const variant = product.variants?.find(
          v => v._id.toString() === item.variantId.toString()
        );

        return {
          product: {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            basePrice: product.basePrice,
            images: product.images,
            status: product.status,
            discount: product.discount
          },
          variant: variant ? {
            _id: variant._id,
            name: variant.name,
            priceAdjustment: variant.priceAdjustment,
            stockQuantity: variant.stockQuantity,
            isActive: variant.isActive,
            imageUrl: variant.imageUrl
          } : null,
          quantity: item.quantity,
          priceAtAdd: item.priceAtAdd,
          addedAt: item.addedAt
        };
      });

      return res.json({
        success: true,
        message: 'Cart updated',
        data: { items: transformedItems }
      });
    } catch (error) {
      console.error('❌ Update quantity error:', error);
      next(error);
    }
  }

  // 🔹 4. Remove item
  async removeItem(req, res, next) {
    try {
      const { variantId } = req.body;
      const userId = req.user?.id;
      const cartId = req.cartId;


      if (!variantId) {
        return res.status(400).json({
          success: false,
          message: 'variantId is required'
        });
      }

      const cart = await Cart.findOne(
        userId ? { userId } : { cartId }
      );

      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      cart.removeItem(variantId);
      await cart.save();

      await cart.populate({
        path: 'items.productId',
        select: 'name slug basePrice images status variants discount'
      });

      const transformedItems = cart.items.map(item => {
        const product = item.productId;
        const variant = product.variants?.find(
          v => v._id.toString() === item.variantId.toString()
        );

        return {
          product: {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            basePrice: product.basePrice,
            images: product.images,
            status: product.status,
            discount: product.discount
          },
          variant: variant ? {
            _id: variant._id,
            name: variant.name,
            priceAdjustment: variant.priceAdjustment,
            stockQuantity: variant.stockQuantity,
            isActive: variant.isActive,
            imageUrl: variant.imageUrl
          } : null,
          quantity: item.quantity,
          priceAtAdd: item.priceAtAdd,
          addedAt: item.addedAt
        };
      });

      return res.json({
        success: true,
        message: 'Item removed from cart',
        data: { items: transformedItems }
      });
    } catch (error) {
      console.error('❌ Remove item error:', error);
      next(error);
    }
  }

  // 🔹 5. Clear cart
  async clearCart(req, res, next) {
    try {
      const userId = req.user?.id;
      const cartId = req.cartId;


      const cart = await Cart.findOne(
        userId ? { userId } : { cartId }
      );

      if (cart) {
        cart.clear();
        await cart.save();
      }

      return res.json({
        success: true,
        message: 'Cart cleared',
        data: { items: [] }
      });
    } catch (error) {
      console.error('❌ Clear cart error:', error);
      next(error);
    }
  }

  // 🔹 6. Merge cart
  async mergeCart(req, res, next) {
    try {
      const userId = req.user?.id;
      const cartId = req.cartId;
      const { items: localItems } = req.body;


      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User must be logged in to merge cart'
        });
      }

      // Tìm customer cart
      let customerCart = await Cart.findOne({ userId });

      if (!customerCart) {
        customerCart = new Cart({
          userId,
          items: []
        });
      }

      // Merge local items
      if (localItems && Array.isArray(localItems)) {
        for (const localItem of localItems) {
          const existingItem = customerCart.items.find(
            item => item.variantId.toString() === localItem.variant._id.toString()
          );

          if (existingItem) {
            existingItem.quantity += localItem.quantity;
          } else {
            // Validate product & variant
            const product = await Product.findById(localItem.product._id);
            if (!product || product.status !== 'active') continue;

            const variant = product.variants.id(localItem.variant._id);
            if (!variant || !variant.isActive) continue;

            customerCart.items.push({
              productId: product._id,
              variantId: variant._id,
              quantity: localItem.quantity,
              priceAtAdd: product.basePrice + (variant.priceAdjustment || 0),
              productName: product.name,
              variantName: variant.name,
              imageUrl: variant.imageUrl || product.images[0]?.url
            });
          }
        }
      }

      // Xóa guest cart nếu có
      await Cart.deleteOne({ cartId });

      await customerCart.save();
      await customerCart.populate({
        path: 'items.productId',
        select: 'name slug basePrice images status variants discount'
      });

      const transformedItems = customerCart.items.map(item => {
        const product = item.productId;
        const variant = product.variants?.find(
          v => v._id.toString() === item.variantId.toString()
        );

        return {
          product: {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            basePrice: product.basePrice,
            images: product.images,
            status: product.status,
            discount: product.discount
          },
          variant: variant ? {
            _id: variant._id,
            name: variant.name,
            priceAdjustment: variant.priceAdjustment,
            stockQuantity: variant.stockQuantity,
            isActive: variant.isActive,
            imageUrl: variant.imageUrl
          } : null,
          quantity: item.quantity,
          priceAtAdd: item.priceAtAdd,
          addedAt: item.addedAt
        };
      });

      return res.json({
        success: true,
        message: 'Carts merged successfully',
        data: { items: transformedItems }
      });
    } catch (error) {
      console.error('❌ Merge cart error:', error);
      next(error);
    }
  }





  // 🔹 7. Sync cart
  async syncCart(req, res, next) {
    try {
      const { items: localItems } = req.body;
      const userId = req.user?.id;
      const cartId = req.cartId;

      if (!Array.isArray(localItems)) {
        return res.status(400).json({
          success: false,
          message: 'items must be an array'
        });
      }

      let cart = await Cart.findOne(
        userId ? { userId } : { cartId }
      );

      if (!cart) {
        cart = new Cart({
          userId: userId || null,
          cartId: !userId ? cartId : null,
          items: [],
          expiresAt: !userId ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null
        });
      }

      // Clear và rebuild
      cart.items = [];

      for (const item of localItems) {
        const product = await Product.findById(item.product._id);
        if (!product || product.status !== 'active') continue;

        const variant = product.variants.id(item.variant._id);
        if (!variant || !variant.isActive) continue;

        cart.items.push({
          productId: product._id,
          variantId: variant._id,
          quantity: item.quantity,
          priceAtAdd: product.basePrice + (variant.priceAdjustment || 0),
          productName: product.name,
          variantName: variant.name,
          imageUrl: variant.imageUrl || product.images[0]?.url
        });
      }

      await cart.save();

      return res.json({
        success: true,
        message: 'Cart synced successfully'
      });
    } catch (error) {
      console.error('❌ Sync cart error:', error);
      next(error);
    }
  }
}

module.exports = new CartController();