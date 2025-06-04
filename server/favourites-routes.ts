import express from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./auth-middleware";
import { logger } from "./logger";

const router = express.Router();

// =============================================================================
// FAVOURITES ROUTES
// =============================================================================

// Add product to favourites
router.post("/favourites", isAuthenticated, async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user!.id;

    if (!productId || typeof productId !== 'number') {
      return res.status(400).json({
        success: false,
        error: "Product ID is required and must be a number"
      });
    }

    // Check if already favourited
    const isAlreadyFavourited = await storage.isProductFavourited(userId, productId);
    if (isAlreadyFavourited) {
      return res.status(409).json({
        success: false,
        error: "Product is already in favourites"
      });
    }

    const favourite = await storage.addToFavourites(userId, productId);
    
    res.json({
      success: true,
      data: favourite
    });
  } catch (error) {
    logger.error("Error adding to favourites", { error, userId: req.user?.id, body: req.body });
    res.status(500).json({
      success: false,
      error: "Failed to add product to favourites"
    });
  }
});

// Remove product from favourites
router.delete("/favourites/:productId", isAuthenticated, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const userId = req.user!.id;

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid product ID"
      });
    }

    const success = await storage.removeFromFavourites(userId, productId);
    
    res.json({
      success: true,
      data: { removed: success }
    });
  } catch (error) {
    logger.error("Error removing from favourites", { error, userId: req.user?.id, productId: req.params.productId });
    res.status(500).json({
      success: false,
      error: "Failed to remove product from favourites"
    });
  }
});

// Get user's favourites
router.get("/favourites", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const withProducts = req.query.withProducts === 'true';

    let favourites;
    if (withProducts) {
      favourites = await storage.getUserFavouritesWithProducts(userId);
    } else {
      favourites = await storage.getUserFavourites(userId);
    }
    
    res.json({
      success: true,
      data: favourites,
      meta: {
        count: favourites.length
      }
    });
  } catch (error) {
    logger.error("Error getting user favourites", { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: "Failed to get favourites"
    });
  }
});

// Check if product is favourited
router.get("/favourites/check/:productId", isAuthenticated, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const userId = req.user!.id;

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid product ID"
      });
    }

    const isFavourited = await storage.isProductFavourited(userId, productId);
    
    res.json({
      success: true,
      data: { isFavourited }
    });
  } catch (error) {
    logger.error("Error checking favourite status", { error, userId: req.user?.id, productId: req.params.productId });
    res.status(500).json({
      success: false,
      error: "Failed to check favourite status"
    });
  }
});

// Get favourite count for a product
router.get("/favourites/count/:productId", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid product ID"
      });
    }

    const count = await storage.getFavouriteCount(productId);
    
    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    logger.error("Error getting favourite count", { error, productId: req.params.productId });
    res.status(500).json({
      success: false,
      error: "Failed to get favourite count"
    });
  }
});

// Get most favourited products
router.get("/favourites/popular", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const products = await storage.getMostFavouritedProducts(limit);
    
    res.json({
      success: true,
      data: products,
      meta: {
        count: products.length,
        limit
      }
    });
  } catch (error) {
    logger.error("Error getting most favourited products", { error, query: req.query });
    res.status(500).json({
      success: false,
      error: "Failed to get popular favourites"
    });
  }
});

// =============================================================================
// PRODUCT INTERACTIONS ROUTES
// =============================================================================

// Log a product interaction
router.post("/interactions", requireAuth, async (req, res) => {
  try {
    const { productId, interactionType, metadata } = req.body;
    const userId = req.user!.id;

    if (!productId || !interactionType) {
      return res.status(400).json({
        success: false,
        error: "Product ID and interaction type are required"
      });
    }

    const interaction = await storage.logProductInteraction({
      userId,
      productId,
      interactionType,
      metadata: metadata || null
    });
    
    res.json({
      success: true,
      data: interaction
    });
  } catch (error) {
    logger.error("Error logging interaction", { error, userId: req.user?.id, body: req.body });
    res.status(500).json({
      success: false,
      error: "Failed to log interaction"
    });
  }
});

// Get product interactions
router.get("/interactions/product/:productId", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const interactionType = req.query.type as string;
    const limit = parseInt(req.query.limit as string) || 100;

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid product ID"
      });
    }

    const interactions = await storage.getProductInteractions(productId, interactionType, limit);
    
    res.json({
      success: true,
      data: interactions,
      meta: {
        count: interactions.length,
        productId,
        interactionType: interactionType || 'all',
        limit
      }
    });
  } catch (error) {
    logger.error("Error getting product interactions", { error, params: req.params, query: req.query });
    res.status(500).json({
      success: false,
      error: "Failed to get product interactions"
    });
  }
});

// Get user interactions
router.get("/interactions/user", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const interactionType = req.query.type as string;
    const limit = parseInt(req.query.limit as string) || 100;

    const interactions = await storage.getUserInteractions(userId, interactionType, limit);
    
    res.json({
      success: true,
      data: interactions,
      meta: {
        count: interactions.length,
        userId,
        interactionType: interactionType || 'all',
        limit
      }
    });
  } catch (error) {
    logger.error("Error getting user interactions", { error, userId: req.user?.id, query: req.query });
    res.status(500).json({
      success: false,
      error: "Failed to get user interactions"
    });
  }
});

// Get product view count
router.get("/interactions/views/:productId", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const from = req.query.from as string;
    const to = req.query.to as string;

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid product ID"
      });
    }

    const dateRange = (from && to) ? { from, to } : undefined;
    const viewCount = await storage.getProductViewCount(productId, dateRange);
    
    res.json({
      success: true,
      data: { 
        productId,
        viewCount,
        dateRange 
      }
    });
  } catch (error) {
    logger.error("Error getting product view count", { error, params: req.params, query: req.query });
    res.status(500).json({
      success: false,
      error: "Failed to get view count"
    });
  }
});

// Get popular products by views
router.get("/interactions/popular", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const from = req.query.from as string;
    const to = req.query.to as string;

    const dateRange = (from && to) ? { from, to } : undefined;
    const products = await storage.getPopularProducts(limit, dateRange);
    
    res.json({
      success: true,
      data: products,
      meta: {
        count: products.length,
        limit,
        dateRange
      }
    });
  } catch (error) {
    logger.error("Error getting popular products", { error, query: req.query });
    res.status(500).json({
      success: false,
      error: "Failed to get popular products"
    });
  }
});

// Get interaction analytics
router.get("/analytics/interactions", async (req, res) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;

    const dateRange = (from && to) ? { from, to } : undefined;
    const analytics = await storage.getInteractionAnalytics(dateRange);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error("Error getting interaction analytics", { error, query: req.query });
    res.status(500).json({
      success: false,
      error: "Failed to get interaction analytics"
    });
  }
});

// =============================================================================
// ABANDONED CART ROUTES
// =============================================================================

// Create abandoned cart
router.post("/abandoned-carts", async (req, res) => {
  try {
    const { sessionId, cartData, userId } = req.body;

    if (!sessionId || !cartData) {
      return res.status(400).json({
        success: false,
        error: "Session ID and cart data are required"
      });
    }

    const abandonedCart = await storage.createAbandonedCart({
      sessionId,
      cartData,
      userId: userId || null,
      emailSent: false,
      discountApplied: false
    });
    
    res.json({
      success: true,
      data: abandonedCart
    });
  } catch (error) {
    logger.error("Error creating abandoned cart", { error, body: req.body });
    res.status(500).json({
      success: false,
      error: "Failed to create abandoned cart"
    });
  }
});

// Get abandoned carts
router.get("/abandoned-carts", async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const emailSent = req.query.emailSent === 'true' ? true : req.query.emailSent === 'false' ? false : undefined;

    const carts = await storage.getAbandonedCarts(userId, emailSent);
    
    res.json({
      success: true,
      data: carts,
      meta: {
        count: carts.length,
        filters: {
          userId,
          emailSent
        }
      }
    });
  } catch (error) {
    logger.error("Error getting abandoned carts", { error, query: req.query });
    res.status(500).json({
      success: false,
      error: "Failed to get abandoned carts"
    });
  }
});

// Update abandoned cart
router.patch("/abandoned-carts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid cart ID"
      });
    }

    const updatedCart = await storage.updateAbandonedCart(id, updates);
    
    if (!updatedCart) {
      return res.status(404).json({
        success: false,
        error: "Abandoned cart not found"
      });
    }

    res.json({
      success: true,
      data: updatedCart
    });
  } catch (error) {
    logger.error("Error updating abandoned cart", { error, params: req.params, body: req.body });
    res.status(500).json({
      success: false,
      error: "Failed to update abandoned cart"
    });
  }
});

// Mark cart as recovered
router.post("/abandoned-carts/:id/recover", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid cart ID"
      });
    }

    const success = await storage.markCartRecovered(id);
    
    res.json({
      success: true,
      data: { recovered: success }
    });
  } catch (error) {
    logger.error("Error marking cart as recovered", { error, params: req.params });
    res.status(500).json({
      success: false,
      error: "Failed to mark cart as recovered"
    });
  }
});

// Get abandoned cart analytics
router.get("/analytics/abandoned-carts", async (req, res) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;

    const dateRange = (from && to) ? { from, to } : undefined;
    const analytics = await storage.getAbandonedCartAnalytics(dateRange);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error("Error getting abandoned cart analytics", { error, query: req.query });
    res.status(500).json({
      success: false,
      error: "Failed to get abandoned cart analytics"
    });
  }
});

export default router;