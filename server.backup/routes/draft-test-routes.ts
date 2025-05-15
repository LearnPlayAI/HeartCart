import { Router } from 'express';
import { storage } from '../storage';
import { logger } from '../logger';
import { isAuthenticated, isAdmin } from '../auth-middleware';
import { objectStore, STORAGE_FOLDERS } from '../object-store';

const router = Router();

// Ensure all routes require authentication and admin permissions
router.use(isAuthenticated);
router.use(isAdmin);

/**
 * Create a draft from an existing product for testing purposes
 * This endpoint allows customization of what gets copied to the draft
 */
router.post('/products/:productId/create-draft-test', async (req, res) => {
  try {
    const { productId } = req.params;
    const productIdNum = parseInt(productId);
    
    if (isNaN(productIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    // Get test options from request body
    const {
      includeImages = true,
      includeAttributes = true,
      includeMetadata = true,
      includeSEO = true,
      includePromotions = true,
      userId = req.user?.id,
      targetStatus = 'draft',
    } = req.body;

    // Validate user ID
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // Get the product
    const product = await storage.getProductById(productIdNum);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Get object store service
    // Using the imported objectStore instance instead of creating a new one

    // Start building draft data
    let draftData: any = {
      name: product.name,
      slug: product.slug,
      description: product.description,
      status: targetStatus,
      userId: userId,
      originalProductId: product.id,
      costPrice: product.costPrice,
      price: product.price,
      stock: product.stock,
      supplierId: product.supplierId,
      catalogId: product.catalogId,
      categoryId: product.categoryId,
      brand: product.brand,
    };

    // Include metadata if specified
    if (includeMetadata) {
      draftData = {
        ...draftData,
        sku: product.sku,
        barcode: product.barcode,
        weight: product.weight,
        dimensions: product.dimensions,
        isActive: product.isActive,
        isNewArrival: product.isNewArrival,
        isBestSeller: product.isBestSeller,
        isOnSale: product.isOnSale,
        isFeatured: product.isFeatured,
        availability: product.availability,
        tags: product.tags,
        keywords: product.keywords,
        taxClass: product.taxClass,
        taxRate: product.taxRate,
        type: product.type,
      };
    }

    // Include SEO data if specified
    if (includeSEO) {
      draftData = {
        ...draftData,
        metaTitle: product.metaTitle,
        metaDescription: product.metaDescription,
        metaKeywords: product.metaKeywords,
        canonicalUrl: product.canonicalUrl,
        robots: product.robots,
        ogTitle: product.ogTitle,
        ogDescription: product.ogDescription,
        ogImage: product.ogImage,
        twitterTitle: product.twitterTitle,
        twitterDescription: product.twitterDescription,
        twitterImage: product.twitterImage,
      };
    }

    // Include promotions data if specified
    if (includePromotions) {
      draftData = {
        ...draftData,
        salePrice: product.salePrice,
        saleStartDate: product.saleStartDate,
        saleEndDate: product.saleEndDate,
        discountValue: product.discountValue,
        discountType: product.discountType,
        discountStartDate: product.discountStartDate,
        discountEndDate: product.discountEndDate,
      };
    }

    // Create the draft
    const draft = await storage.createProductDraft(draftData);

    // Set up result object with test metadata
    const result = {
      success: true,
      testOptions: {
        includeImages,
        includeAttributes,
        includeMetadata,
        includeSEO,
        includePromotions,
        userId,
        targetStatus,
      },
      originalProduct: {
        id: product.id,
        name: product.name,
        supplierId: product.supplierId,
        catalogId: product.catalogId,
      },
      draftId: draft.id,
      draft: draft,
      attributesCopied: false,
      imagesCopied: false,
    };

    // Additional operations: Copy attributes if specified
    if (includeAttributes) {
      try {
        const productAttributes = await storage.getProductAttributeValues(productIdNum);
        
        if (productAttributes && productAttributes.length > 0) {
          // Process and store attribute values for the draft
          const attributePromises = productAttributes.map(attr => 
            storage.createProductDraftAttributeValue({
              draftId: draft.id,
              attributeId: attr.attributeId,
              value: attr.value,
            })
          );
          
          await Promise.all(attributePromises);
          result.attributesCopied = true;
        }
      } catch (attrErr) {
        logger.error('Error copying attributes to draft', { 
          error: attrErr, 
          productId: productIdNum, 
          draftId: draft.id 
        });
        result.attributeError = attrErr.message;
      }
    }

    // Copy images if specified
    if (includeImages && product.imageUrl) {
      try {
        // If product has images, copy them to the draft folder
        const originalImageKey = product.imageObjectKey || `products/${product.id}/main.jpg`;
        const draftImageKey = `drafts/${draft.id}/main.jpg`;
        
        // Attempt to copy image
        await objectStore.copyObject(originalImageKey, draftImageKey);
        
        // Update draft with image info
        await storage.updateProductDraft(draft.id, {
          imageUrl: product.imageUrl,
          imageObjectKey: draftImageKey,
          mainImageIndex: product.mainImageIndex || 0,
        });
        
        result.imagesCopied = true;
      } catch (imageErr) {
        logger.error('Error copying images to draft', { 
          error: imageErr, 
          productId: productIdNum, 
          draftId: draft.id 
        });
        result.imageError = imageErr.message;
      }
    }

    // Return success with draft data and test meta information
    return res.json({
      success: true,
      message: 'Draft created successfully for testing',
      data: result
    });
  } catch (error) {
    logger.error('Error in test draft creation', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to create test draft',
      error: error.message,
    });
  }
});

export default router;