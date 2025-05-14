import { Router } from "express";
import { storage } from "./storage";
import { asyncHandler, NotFoundError, BadRequestError } from "./error-handler";
import { isAdmin, isAuthenticated } from "./auth-middleware";
import { validateRequest } from "./validation-middleware";
import { logger } from "./logger";
import { sendSuccess } from "./api-response";
import multer from "multer";
import { 
  createProductDraftSchema, 
  updateProductDraftSchema, 
  productDraftIdParamSchema, 
  updateProductDraftWizardStepSchema,
  publishProductDraftSchema
} from "@shared/validation-schemas";
import { objectStore, STORAGE_FOLDERS } from "./object-store";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Configure multer for in-memory storage (we'll upload to Replit Object Store)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Only accept images
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'));
    }
    cb(null, true);
  }
});

export default function registerProductDraftRoutes(router: Router) {
  /**
   * Create a new product draft
   * POST /api/product-drafts
   */
  router.post(
    "/api/product-drafts",
    isAuthenticated,
    validateRequest({ body: createProductDraftSchema }),
    asyncHandler(async (req, res) => {
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError("User ID is required");
      }

      // Add user ID to the draft data
      const draftData = {
        ...req.body,
        createdBy: userId,
        draftStatus: "draft"
      };

      // If originalProductId is provided, load the product data
      if (draftData.originalProductId) {
        logger.debug('Creating draft from existing product', { originalProductId: draftData.originalProductId });
        
        const product = await storage.getProductById(draftData.originalProductId);
        if (!product) {
          throw new NotFoundError("Original product not found");
        }
        
        // Check if a draft already exists for this product
        const existingDraft = await storage.getProductDraftByOriginalId(draftData.originalProductId);
        if (existingDraft) {
          logger.debug('Found existing draft for product', { 
            productId: draftData.originalProductId,
            draftId: existingDraft.id 
          });
          // Return the existing draft
          return sendSuccess(res, existingDraft);
        }

        // Prefill the draft with product data
        logger.debug('Prefilling draft with product data', { productId: product.id });
        
        Object.assign(draftData, {
          originalProductId: product.id, // Ensure this is set explicitly
          name: product.name || "",
          slug: product.slug || "",
          description: product.description || "",
          brand: product.brand || "",
          sku: product.sku || "",
          categoryId: product.categoryId || null,
          isActive: !!product.isActive,
          isFeatured: !!product.isFeatured,
          // Map from product price fields to draft price fields
          costPrice: product.costPrice || null,
          regularPrice: product.price || null,
          salePrice: product.salePrice || null,
          onSale: product.salePrice !== null && product.salePrice < product.price,
          markupPercentage: product.markupPercentage || null,
          // Other fields
          stockLevel: product.stock || 0,
          lowStockThreshold: product.lowStockThreshold || 5,
          backorderEnabled: !!product.backorderEnabled,
          attributes: [], // Will be populated from product attributes
          supplierId: product.supplierId || null,
          taxable: product.taxable !== false, // Default to true
          taxClass: product.taxClass || "standard",
          // Images
          imageUrls: product.imageUrl ? [product.imageUrl, ...(product.additionalImages || [])] : [],
          // Set blank placeholders for object keys, these will be populated later if needed
          imageObjectKeys: product.imageUrl ? Array(1 + (product.additionalImages?.length || 0)).fill('') : [],
          mainImageIndex: 0,
          // Additional fields
          discountLabel: product.discountLabel || "",
          specialSaleText: product.specialSaleText || "",
          dimensions: product.dimensions || "",
          weight: product.weight?.toString() || "",
          isFlashDeal: !!product.isFlashDeal,
          metaTitle: product.metaTitle || "",
          metaDescription: product.metaDescription || "",
          metaKeywords: product.metaKeywords || "",
          // Handle date fields - store as string in ISO format for consistency
          specialSaleStart: product.specialSaleStart ? new Date(product.specialSaleStart).toISOString() : null,
          specialSaleEnd: product.specialSaleEnd ? new Date(product.specialSaleEnd).toISOString() : null,
          flashDealEnd: product.flashDealEnd ? new Date(product.flashDealEnd).toISOString() : null,
          // Initialize wizard progress - mark all steps as incomplete initially
          // This ensures the UI will show the proper progress state
          wizardProgress: {
            "basic-info": false,
            "images": false,
            "additional-info": false,
            "sales-promotions": false,
            "review": false
          },
          // Initialize completedSteps as an empty array
          completedSteps: [],
        });

        // Load and map product attributes using the new attribute system
        try {
          const productAttributes = await storage.getProductAttributes(product.id);
          if (productAttributes?.length) {
            // Prepare attributes array with comprehensive mapping of all fields
            draftData.attributes = productAttributes.map(pa => ({
              attributeId: pa.attributeId,
              // Use any available value (textValue or selectedOptions) with fallbacks
              value: pa.textValue || (Array.isArray(pa.selectedOptions) && pa.selectedOptions.length > 0 
                ? pa.selectedOptions 
                : []),
              // Include attribute metadata
              attributeName: pa.attribute?.name || "",
              attributeDisplayName: pa.overrideDisplayName || pa.attribute?.displayName || "",
              attributeType: pa.attribute?.attributeType || "text",
              isRequired: !!pa.isRequired,
              sortOrder: pa.sortOrder || 0,
              // Include any override values from the product attribute
              overrideDisplayName: pa.overrideDisplayName || null,
              overrideDescription: pa.overrideDescription || null
            }));
            
            logger.debug('Mapped product attributes to draft', { 
              productId: product.id, 
              attributesCount: productAttributes.length,
              attributeIds: productAttributes.map(pa => pa.attributeId)
            });
          } else {
            logger.debug('No product attributes found to map to draft', { productId: product.id });
            // Initialize with empty array to ensure it's not null
            draftData.attributes = [];
          }
        } catch (attrError) {
          logger.error('Error loading product attributes for draft', { error: attrError, productId: product.id });
          // Don't block the draft creation if attribute loading fails
          draftData.attributes = [];
        }
      }

      const draft = await storage.createProductDraft(draftData);
      sendSuccess(res, draft);
    })
  );

  /**
   * Get a product draft by ID
   * GET /api/product-drafts/:id
   */
  router.get(
    "/api/product-drafts/:id",
    isAuthenticated,
    validateRequest({ params: productDraftIdParamSchema }),
    asyncHandler(async (req, res) => {
      const draftId = parseInt(req.params.id);
      const draft = await storage.getProductDraft(draftId);
      
      if (!draft) {
        throw new NotFoundError("Product draft not found");
      }
      
      // Check if user has permission to access this draft
      if (draft.createdBy !== req.user?.id && req.user?.role !== 'admin') {
        throw new BadRequestError("You don't have permission to access this draft");
      }
      
      sendSuccess(res, draft);
    })
  );

  /**
   * Get all product drafts for the current user
   * GET /api/product-drafts
   */
  router.get(
    "/api/product-drafts",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError("User ID is required");
      }
      
      const drafts = await storage.getUserProductDrafts(userId);
      sendSuccess(res, drafts);
    })
  );

  /**
   * Update a product draft
   * PATCH /api/product-drafts/:id
   */
  router.patch(
    "/api/product-drafts/:id",
    isAuthenticated,
    validateRequest({ 
      params: productDraftIdParamSchema,
      body: updateProductDraftSchema
    }),
    asyncHandler(async (req, res) => {
      const draftId = parseInt(req.params.id);
      const draft = await storage.getProductDraft(draftId);
      
      if (!draft) {
        throw new NotFoundError("Product draft not found");
      }
      
      // Check if user has permission to update this draft
      if (draft.createdBy !== req.user?.id && req.user?.role !== 'admin') {
        throw new BadRequestError("You don't have permission to update this draft");
      }
      
      const updatedDraft = await storage.updateProductDraft(draftId, req.body);
      sendSuccess(res, updatedDraft);
    })
  );

  /**
   * Update a specific wizard step of a product draft
   * PATCH /api/product-drafts/:id/wizard-step
   */
  router.patch(
    "/api/product-drafts/:id/wizard-step",
    isAuthenticated,
    validateRequest({ 
      params: productDraftIdParamSchema,
      body: updateProductDraftWizardStepSchema
    }),
    asyncHandler(async (req, res) => {
      const draftId = parseInt(req.params.id);
      const { step, data } = req.body;
      
      const draft = await storage.getProductDraft(draftId);
      
      if (!draft) {
        throw new NotFoundError("Product draft not found");
      }
      
      // Check if user has permission to update this draft
      if (draft.createdBy !== req.user?.id && req.user?.role !== 'admin') {
        throw new BadRequestError("You don't have permission to update this draft");
      }
      
      const updatedDraft = await storage.updateProductDraftWizardStep(draftId, step, data);
      sendSuccess(res, updatedDraft);
    })
  );

  /**
   * Upload images for a product draft
   * POST /api/product-drafts/:id/images
   */
  router.post(
    "/api/product-drafts/:id/images",
    isAuthenticated,
    validateRequest({ params: productDraftIdParamSchema }),
    upload.array('images', 10), // Allow up to 10 images
    asyncHandler(async (req, res) => {
      const draftId = parseInt(req.params.id);
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        throw new BadRequestError("No images uploaded");
      }
      
      const draft = await storage.getProductDraft(draftId);
      
      if (!draft) {
        throw new NotFoundError("Product draft not found");
      }
      
      // Check if user has permission to update this draft
      if (draft.createdBy !== req.user?.id && req.user?.role !== 'admin') {
        throw new BadRequestError("You don't have permission to update this draft");
      }
      
      // Get current images
      const currentImageUrls = draft.imageUrls || [];
      const currentImageObjectKeys = draft.imageObjectKeys || [];
      
      // Upload new images to object store
      const imagePromises = files.map(async (file) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const objectKey = `${STORAGE_FOLDERS.PRODUCT_IMAGES}/${uuidv4()}${extension}`;
        
        // Upload to object store
        const uploadResult = await objectStore.uploadFromBuffer(
          objectKey, 
          file.buffer, 
          { contentType: file.mimetype }
        );
        
        // Return image info
        return {
          imageUrl: uploadResult.publicUrl,
          objectKey: uploadResult.objectKey
        };
      });
      
      // Wait for all uploads to complete
      const newImages = await Promise.all(imagePromises);
      
      // Merge with existing images
      const imageUrls = [...currentImageUrls, ...newImages.map(img => img.imageUrl)];
      const imageObjectKeys = [...currentImageObjectKeys, ...newImages.map(img => img.objectKey)];
      
      // Update the draft
      const updatedDraft = await storage.updateProductDraftImages(
        draftId, 
        imageUrls, 
        imageObjectKeys, 
        draft.mainImageIndex || 0
      );
      
      sendSuccess(res, updatedDraft);
    })
  );

  /**
   * Delete an image from a product draft
   * DELETE /api/product-drafts/:id/images/:imageIndex
   */
  router.delete(
    "/api/product-drafts/:id/images/:imageIndex",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const draftId = parseInt(req.params.id);
      const imageIndex = parseInt(req.params.imageIndex);
      
      if (isNaN(imageIndex)) {
        throw new BadRequestError("Invalid image index");
      }
      
      const draft = await storage.getProductDraft(draftId);
      
      if (!draft) {
        throw new NotFoundError("Product draft not found");
      }
      
      // Check if user has permission to update this draft
      if (draft.createdBy !== req.user?.id && req.user?.role !== 'admin') {
        throw new BadRequestError("You don't have permission to update this draft");
      }
      
      const updatedDraft = await storage.deleteProductDraftImage(draftId, imageIndex);
      sendSuccess(res, updatedDraft);
    })
  );

  /**
   * Publish a product draft
   * POST /api/product-drafts/:id/publish
   */
  router.post(
    "/api/product-drafts/:id/publish",
    isAuthenticated,
    validateRequest({ params: productDraftIdParamSchema }),
    asyncHandler(async (req, res) => {
      const draftId = parseInt(req.params.id);
      
      const draft = await storage.getProductDraft(draftId);
      
      if (!draft) {
        throw new NotFoundError("Product draft not found");
      }
      
      // Check if user has permission to publish this draft
      if (draft.createdBy !== req.user?.id && req.user?.role !== 'admin') {
        throw new BadRequestError("You don't have permission to publish this draft");
      }
      
      // Basic validation before publishing
      if (!draft.name) {
        throw new BadRequestError("Product name is required");
      }
      
      if (!draft.categoryId) {
        throw new BadRequestError("Product category is required");
      }
      
      if (!draft.regularPrice) {
        throw new BadRequestError("Product price is required");
      }
      
      // Publish the draft
      const product = await storage.publishProductDraft(draftId);
      sendSuccess(res, product);
    })
  );

  /**
   * Delete a product draft
   * DELETE /api/product-drafts/:id
   */
  router.delete(
    "/api/product-drafts/:id",
    isAuthenticated,
    validateRequest({ params: productDraftIdParamSchema }),
    asyncHandler(async (req, res) => {
      const draftId = parseInt(req.params.id);
      
      const draft = await storage.getProductDraft(draftId);
      
      if (!draft) {
        throw new NotFoundError("Product draft not found");
      }
      
      // Check if user has permission to delete this draft
      if (draft.createdBy !== req.user?.id && req.user?.role !== 'admin') {
        throw new BadRequestError("You don't have permission to delete this draft");
      }
      
      await storage.deleteProductDraft(draftId);
      sendSuccess(res, { success: true });
    })
  );
}