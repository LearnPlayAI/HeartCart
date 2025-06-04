import { Router } from "express";
import { storage } from "./storage";
import { asyncHandler, NotFoundError, BadRequestError } from "./error-handler";
import { isAdmin, isAuthenticated } from "./auth-middleware";
import { validateRequest } from "./validation-middleware";
import { logger } from "./logger";
import { sendSuccess } from "./api-response";
import { publishProductDraft } from "./product-publication-simple";
import multer from "multer";
import { 
  createProductDraftSchema, 
  updateProductDraftSchema, 
  productDraftIdParamSchema, 
  updateProductDraftWizardStepSchema,
  publishProductDraftSchema,
  updateProductDraftStatusSchema
} from "@shared/validation-schemas";
import { objectStore, STORAGE_FOLDERS } from "./object-store";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db";
import { productDrafts, ProductDraft, products, productImages } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

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

      // If a brand new draft is needed (not editing an existing product)
      if (!req.body.originalProductId) {
        let draftData = {
          ...req.body,
          createdBy: userId,
          draftStatus: "draft"
        };
        
        const draft = await storage.createProductDraft(draftData);
        return sendSuccess(res, draft);
      }
      
      // If we're editing an existing product, use the SQL function to create/get the draft
      logger.debug('Creating draft from existing product using SQL function', { 
        originalProductId: req.body.originalProductId,
        userId
      });
      
      try {
        // Use the SQL function we created to generate a draft with all fields populated
        const result = await db.execute(
          sql`SELECT * FROM create_product_draft_from_product(${req.body.originalProductId}, ${userId})`
        );
        
        if (!result.rows || result.rows.length === 0) {
          throw new Error('Failed to create draft from product');
        }
        
        const draftRecord = result.rows[0] as any;
        
        logger.debug('Created draft from product using SQL function', {
          draftId: draftRecord.id,
          productId: draftRecord.original_product_id
        });
        
        // Load product attributes if needed
        if (!draftRecord.attributes || draftRecord.attributes.length === 0) {
          try {
            const productAttributes = await storage.getProductAttributes(req.body.originalProductId);
            if (productAttributes?.length) {
              // Map attributes for the draft
              const mappedAttributes = productAttributes.map(pa => ({
                attributeId: pa.attributeId,
                value: pa.textValue || (Array.isArray(pa.selectedOptions) && pa.selectedOptions.length > 0 
                  ? pa.selectedOptions 
                  : []),
                attributeName: pa.attribute?.name || "",
                attributeDisplayName: pa.overrideDisplayName || pa.attribute?.displayName || "",
                attributeType: pa.attribute?.attributeType || "text",
                isRequired: !!pa.isRequired,
                sortOrder: pa.sortOrder || 0,
                overrideDisplayName: pa.overrideDisplayName || null,
                overrideDescription: pa.overrideDescription || null
              }));
              
              // Update the draft with attributes
              await storage.updateProductDraft(result.id, { attributes: mappedAttributes });
              result.attributes = mappedAttributes;
            } else {
              logger.debug('No product attributes found to map to draft', { productId: req.body.originalProductId });
            }
          } catch (attrError) {
            logger.error('Error loading product attributes for draft', { 
              error: attrError, 
              productId: req.body.originalProductId 
            });
          }
        }
        
        // Format the result to match what the client expects
        const formattedDraft = {
          id: result.id,
          originalProductId: result.original_product_id,
          draftStatus: result.draft_status,
          createdBy: result.created_by,
          createdAt: result.created_at,
          lastModified: result.last_modified,
          name: result.name,
          slug: result.slug,
          sku: result.sku,
          description: result.description,
          brand: result.brand,
          categoryId: result.category_id,
          isActive: result.is_active,
          isFeatured: result.is_featured,
          costPrice: result.cost_price,
          regularPrice: result.regular_price,
          salePrice: result.sale_price,
          onSale: result.on_sale,
          markupPercentage: result.markup_percentage,
          imageUrls: result.image_urls,
          imageObjectKeys: result.image_object_keys,
          mainImageIndex: result.main_image_index || 0,
          stockLevel: result.stock_level || 0,
          lowStockThreshold: result.low_stock_threshold || 5,
          backorderEnabled: result.backorder_enabled || false,
          attributes: result.attributes || [],
          supplierId: result.supplier_id,
          weight: result.weight,
          dimensions: result.dimensions,
          discountLabel: result.discount_label,
          specialSaleText: result.special_sale_text,
          specialSaleStart: result.special_sale_start,
          specialSaleEnd: result.special_sale_end,
          isFlashDeal: result.is_flash_deal,
          flashDealEnd: result.flash_deal_end,
          taxable: result.taxable,
          taxClass: result.tax_class,
          metaTitle: result.meta_title,
          metaDescription: result.meta_description,
          metaKeywords: result.meta_keywords,
          wizardProgress: result.wizard_progress,
          completedSteps: result.completed_steps || []
        };
        
        return sendSuccess(res, formattedDraft);
      } catch (error) {
        logger.error('Error creating draft from product', { 
          error, 
          productId: req.body.originalProductId 
        });
        throw error;
      }
    })
  );

  /**
   * Create a draft from an existing product
   * POST /api/product-drafts/from-product/:productId
   */
  router.post(
    "/api/product-drafts/from-product/:productId",
    isAuthenticated,
    validateRequest({
      params: z.object({
        productId: z.string().transform((val) => parseInt(val, 10)),
      }),
    }),
    asyncHandler(async (req, res) => {
      const productId = parseInt(req.params.productId, 10);
      const userId = req.user?.id;
      
      if (!userId) {
        throw new BadRequestError("User ID is required");
      }
      
      if (isNaN(productId)) {
        throw new BadRequestError("Invalid product ID");
      }
      
      try {
        // Create draft from existing product
        const draft = await storage.createDraftFromProduct(productId, userId);
        
        sendSuccess(res, draft);
      } catch (error) {
        logger.error("Error creating draft from product", { error, productId });
        throw new BadRequestError("Failed to create draft from product");
      }
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
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      const draft = await storage.getProductDraft(draftId, userRole, userId);
      
      if (!draft) {
        throw new NotFoundError("Product draft not found");
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
    validateRequest({
      query: z.object({
        limit: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
        offset: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
        search: z.string().optional(),
        parentCategoryId: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
        childCategoryId: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
        minTmyPercent: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
        statusFilter: z.enum(['all', 'active', 'inactive']).optional()
      })
    }),
    asyncHandler(async (req, res) => {
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError("User ID is required");
      }
      
      const {
        limit = 20,
        offset = 0,
        search,
        parentCategoryId,
        childCategoryId,
        minTmyPercent,
        statusFilter
      } = req.query;

      const drafts = await storage.getUserProductDrafts(userId, {
        limit,
        offset,
        search,
        parentCategoryId,
        childCategoryId,
        minTmyPercent,
        statusFilter
      });
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
      const { step, draftData } = req.body;
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      const draft = await storage.getProductDraft(draftId, userRole, userId);
      
      if (!draft) {
        throw new NotFoundError("Product draft not found");
      }
      
      const updatedDraft = await storage.updateProductDraftWizardStep(draftId, step, draftData);
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
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      if (!files || files.length === 0) {
        throw new BadRequestError("No images uploaded");
      }
      
      const draft = await storage.getProductDraft(draftId, userRole, userId);
      
      if (!draft) {
        throw new NotFoundError("Product draft not found");
      }
      
      // Get current images
      const currentImageUrls = draft.imageUrls || [];
      const currentImageObjectKeys = draft.imageObjectKeys || [];
      
      // Get supplier and catalog details for proper folder naming
      let supplierName = 'unknown-supplier';
      let catalogName = '';
      
      if (draft.supplierId) {
        // Get supplier name from database
        const supplier = await storage.getSupplierById(draft.supplierId);
        if (supplier) {
          supplierName = supplier.name;
          console.log(`Using supplier name: ${supplierName} for folder path`);
        }
      }
      
      if (draft.catalogId) {
        // Get catalog name from database
        const catalog = await storage.getCatalogById(draft.catalogId);
        if (catalog) {
          catalogName = catalog.name;
          console.log(`Using catalog name: ${catalogName} for folder path`);
        }
      }
      
      // Upload new images to object store with the correct draft folder structure
      const imagePromises = files.map(async (file) => {
        // Process the image to optimize it
        const processedBuffer = await objectStore.processImage(file.buffer, {
          width: 1200,
          height: 1200,
          fit: 'inside',
          withoutEnlargement: true,
          quality: 85,
          autoRotate: true
        });
        
        // Upload with new path strategy using correct supplier and catalog names
        const uploadResult = await objectStore.uploadDraftImage(
          processedBuffer,
          file.originalname,
          draftId,
          file.mimetype,
          supplierName,
          draft.catalogId,
          catalogName
        );
        
        // Return image info
        return {
          imageUrl: uploadResult.url,
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
      
      // Check if the image exists at the specified index
      if (!draft.imageObjectKeys || !draft.imageObjectKeys[imageIndex]) {
        throw new BadRequestError(`No image exists at index ${imageIndex}`);
      }
      
      // Log the image object key that we're about to delete for debugging
      const objectKey = draft.imageObjectKeys[imageIndex];
      console.log(`Attempting to delete image at index ${imageIndex}:`, {
        draftId, 
        imageIndex, 
        objectKey,
        allObjectKeys: draft.imageObjectKeys
      });
      
      const updatedDraft = await storage.deleteProductDraftImage(draftId, imageIndex);
      sendSuccess(res, updatedDraft);
    })
  );
  
  /**
   * Reorder images for a product draft
   * POST /api/product-drafts/:id/images/reorder
   */
  router.post(
    "/api/product-drafts/:id/images/reorder",
    isAuthenticated,
    validateRequest({ params: productDraftIdParamSchema }),
    asyncHandler(async (req, res) => {
      const draftId = parseInt(req.params.id);
      const { imageIndexes } = req.body;
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      if (!Array.isArray(imageIndexes)) {
        throw new BadRequestError("Invalid image indexes: expected array");
      }
      
      const draft = await storage.getProductDraft(draftId, userRole, userId);
      
      if (!draft) {
        throw new NotFoundError("Product draft not found");
      }
      
      const updatedDraft = await storage.reorderProductDraftImages(draftId, imageIndexes);
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
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      const draft = await storage.getProductDraft(draftId, userRole, userId);
      
      if (!draft) {
        throw new NotFoundError("Product draft not found");
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
      
      // Use the complete publication service with ALL field mapping
      try {
        logger.info('PUBLICATION ROUTE: Starting publication process', { 
          draftId, 
          draftName: draft.name,
          hasAttributesData: !!draft.attributesData 
        });
        
        const { publishProductDraftComplete } = await import('./product-publication-complete');
        const result = await publishProductDraftComplete(draftId);
        
        logger.info('PUBLICATION ROUTE: Publication completed', { 
          draftId, 
          success: result.success,
          productId: result.productId 
        });

        if (result.success) {
          logger.info('Product published successfully via atomic service', { 
            draftId, 
            productId: result.productId,
            publishedBy: req.user?.id 
          });

          sendSuccess(res, {
            productId: result.productId,
            draftId: draftId,
            message: "Product published successfully"
          });
        } else {
          logger.error('Atomic publication failed', { 
            draftId, 
            error: result.error 
          });

          throw new BadRequestError(result.error || "Failed to publish product. Please try again.");
        }
      } catch (publishError) {
        logger.error("Error in atomic publication", { error: publishError, draftId });
        throw new BadRequestError("Failed to publish product. Please try again.");
      }
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
      
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      const draft = await storage.getProductDraft(draftId, userRole, userId);
      
      if (!draft) {
        throw new NotFoundError("Product draft not found");
      }
      
      console.log(`Attempting to delete draft with ID ${draftId}`);
      
      try {
        const result = await storage.deleteProductDraft(draftId);
        console.log(`Draft deletion result:`, result);
        sendSuccess(res, { success: true, message: 'Draft deleted successfully' });
      } catch (deleteError) {
        console.error(`Failed to delete draft ${draftId}:`, deleteError);
        throw deleteError;
      }
    })
  );

  /**
   * Validate a product draft
   * POST /api/product-drafts/:id/validate
   */
  router.post(
    "/api/product-drafts/:id/validate",
    isAuthenticated,
    validateRequest({ params: productDraftIdParamSchema }),
    asyncHandler(async (req, res) => {
      const draftId = parseInt(req.params.id);
      const { step } = req.body;
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      const draft = await storage.getProductDraft(draftId, userRole, userId);
      
      if (!draft) {
        throw new NotFoundError("Product draft not found");
      }
      
      // Validate based on step
      const errors: Record<string, string[]> = {};
      let isValid = true;
      
      if (!step || step === 'basic-info') {
        // Basic info validation
        if (!draft.name || draft.name.trim() === '') {
          errors['name'] = ["Product name is required"];
          isValid = false;
        }
        
        if (!draft.slug || draft.slug.trim() === '') {
          errors['slug'] = ["Product URL slug is required"];
          isValid = false;
        }
        
        if (!draft.categoryId) {
          errors['categoryId'] = ["Product category is required"];
          isValid = false;
        }
      }
      
      if (!step || step === 'pricing') {
        // Pricing validation - convert strings to numbers for proper comparison
        const regularPrice = typeof draft.regularPrice === 'string' ? parseFloat(draft.regularPrice) : draft.regularPrice;
        const salePrice = typeof draft.salePrice === 'string' ? parseFloat(draft.salePrice) : draft.salePrice;
        
        if (!regularPrice || regularPrice <= 0) {
          errors['regularPrice'] = ["Regular price must be greater than 0"];
          isValid = false;
        }
        
        if (salePrice !== null && salePrice !== undefined && !isNaN(salePrice)) {
          if (salePrice <= 0) {
            errors['salePrice'] = ["Sale price must be greater than 0"];
            isValid = false;
          }
          
          if (salePrice >= regularPrice) {
            errors['salePrice'] = ["Sale price must be less than regular price"];
            isValid = false;
          }
        }
      }
      
      if (!step || step === 'images') {
        // Images validation
        if (!draft.imageUrls || draft.imageUrls.length === 0) {
          errors['images'] = ["At least one product image is required"];
          isValid = false;
        }
      }
      
      // Update completedSteps if validation passed for this step
      if (step && isValid && !errors[step]) {
        const completedSteps = draft.completedSteps || [];
        if (!completedSteps.includes(step)) {
          await storage.updateProductDraft(draftId, {
            completedSteps: [...completedSteps, step]
          });
        }
      }
      
      sendSuccess(res, {
        isValid,
        errors,
        completedSteps: draft.completedSteps || []
      });
    })
  );

  /**
   * Check if a draft is ready to publish
   * GET /api/product-drafts/:id/publish-check
   */
  router.get(
    "/api/product-drafts/:id/publish-check",
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
      
      // Check essential requirements
      const missingFields: string[] = [];
      
      if (!draft.name) missingFields.push("name");
      if (!draft.categoryId) missingFields.push("category");
      if (!draft.regularPrice) missingFields.push("regularPrice");
      if (!draft.imageUrls || draft.imageUrls.length === 0) missingFields.push("images");
      
      const isReadyToPublish = missingFields.length === 0;
      
      sendSuccess(res, {
        isReadyToPublish,
        missingFields,
        requiredSteps: isReadyToPublish ? [] : ['basic-info', 'images', 'pricing'].filter(step => {
          if (step === 'basic-info' && (!draft.name || !draft.categoryId)) return true;
          if (step === 'images' && (!draft.imageUrls || draft.imageUrls.length === 0)) return true;
          if (step === 'pricing' && !draft.regularPrice) return true;
          return false;
        })
      });
    })
  );
  
  /**
   * Update the status of a product draft
   * PATCH /api/product-drafts/:id/status
   */
  router.patch(
    "/api/product-drafts/:id/status",
    isAuthenticated,
    validateRequest({ 
      params: productDraftIdParamSchema,
      body: updateProductDraftStatusSchema
    }),
    asyncHandler(async (req, res) => {
      const draftId = parseInt(req.params.id);
      const { status, note } = req.body;
      
      logger.debug('Status update request received', {
        draftId,
        status,
        hasNote: !!note,
        userId: req.user?.id
      });
      
      const draft = await storage.getProductDraft(draftId);
      
      if (!draft) {
        logger.warn('Draft not found during status update', { draftId });
        throw new NotFoundError("Product draft not found");
      }
      
      // Enhanced debugging for draft object
      logger.debug('Draft retrieved for status update', {
        draftId: draft.id,
        currentStatus: draft.draftStatus,
        newStatus: status,
        completedSteps: draft.completedSteps,
        hasChangeHistory: !!draft.changeHistory,
        changeHistoryType: draft.changeHistory ? typeof draft.changeHistory : 'undefined'
      });
      
      // Check if user has permission to update this draft
      if (draft.createdBy !== req.user?.id && req.user?.role !== 'admin') {
        throw new BadRequestError("You don't have permission to update this draft");
      }
      
      // Perform status-specific validations
      if (status === 'ready_to_publish') {
        // Perform validation to ensure the draft is complete enough to be published
        logger.debug('Validating draft before status change to ready_to_publish', { draftId });
        
        const validationResult = await storage.validateProductDraft(draftId);
        
        if (!validationResult.isValid) {
          logger.warn('Draft validation failed during status change', {
            draftId,
            errors: validationResult.errors
          });
          
          return sendSuccess(res, {
            success: false,
            message: "Draft validation failed",
            errors: validationResult.errors
          });
        }
        
        logger.debug('Draft validation passed for status change', { draftId });
      }
      
      try {
        // Detailed pre-update logging
        logger.debug('About to update product draft status', {
          draftId,
          fromStatus: draft.draftStatus,
          toStatus: status,
          note: note || null,
          changeHistoryBefore: draft.changeHistory
        });
        
        // Update the draft status
        const updatedDraft = await storage.updateProductDraftStatus(draftId, status, note);
        
        // Detailed post-update logging
        logger.debug('Draft status updated successfully', {
          draftId: updatedDraft.id,
          newStatus: updatedDraft.draftStatus,
          hasChangeHistory: !!updatedDraft.changeHistory,
          changeHistoryLength: updatedDraft.changeHistory ? updatedDraft.changeHistory.length : 0
        });
        
        // Log the status change
        logger.info(`Product draft status updated`, {
          draftId,
          oldStatus: draft.draftStatus,
          newStatus: status,
          updatedBy: req.user?.id
        });
        
        sendSuccess(res, updatedDraft);
      } catch (error) {
        // Enhanced error logging
        logger.error(`Error updating product draft status in route handler`, {
          error,
          draftId,
          status,
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          draftBeforeUpdate: draft ? {
            id: draft.id,
            status: draft.draftStatus,
            changeHistoryType: draft.changeHistory ? typeof draft.changeHistory : 'undefined'
          } : 'not available'
        });
        throw error;
      }
    })
  );

  /**
   * Create a draft from an existing published product for editing
   * POST /api/product-drafts/create-from-published/:productId
   */
  router.post(
    "/api/product-drafts/create-from-published/:productId",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const productId = parseInt(req.params.productId);
      const userId = req.user?.id;

      if (!userId) {
        throw new BadRequestError("Authentication required");
      }

      if (!productId || isNaN(productId)) {
        throw new BadRequestError("Valid product ID is required");
      }

      logger.debug('Creating draft from published product using SQL function', { 
        productId,
        userId
      });
      
      try {
        // First check if ANY draft exists for this product (draft OR published status)
        logger.debug('Checking for existing drafts', { productId });
        
        const existingDrafts = await db.select()
          .from(productDrafts)
          .where(eq(productDrafts.originalProductId, productId));
        
        logger.debug('Found existing drafts', { 
          productId, 
          draftCount: existingDrafts.length,
          drafts: existingDrafts.map(d => ({ id: d.id, status: d.draftStatus }))
        });
        
        if (existingDrafts.length > 0) {
          const existingDraft = existingDrafts[0];
          
          // If it's already a draft, reuse it
          if (existingDraft.draftStatus === 'draft') {
            logger.debug('Found existing draft for product, reusing it', {
              draftId: existingDraft.id,
              productId,
              originalProductId: existingDraft.originalProductId,
              name: existingDraft.name
            });
            
            return sendSuccess(res, { 
              draftId: existingDraft.id,
              message: "Using existing draft for product editing"
            });
          }
          
          // If it's published, change status back to draft - NEVER create new records
          if (existingDraft.draftStatus === 'published') {
            logger.debug('Found published draft, converting back to draft status', {
              draftId: existingDraft.id,
              productId,
              originalProductId: existingDraft.originalProductId,
              name: existingDraft.name
            });
            
            // Update the existing draft record to change status from published to draft
            const now = new Date().toISOString();
            
            try {
              const updateResult = await db.update(productDrafts)
                .set({
                  draftStatus: 'draft',
                  lastModified: now
                })
                .where(eq(productDrafts.id, existingDraft.id))
                .returning();
                
              logger.debug('Draft status update completed successfully', {
                draftId: existingDraft.id,
                updatedRows: updateResult.length,
                newStatus: 'draft',
                timestamp: now
              });
              
              if (updateResult.length === 0) {
                throw new Error(`No rows updated for draft ID ${existingDraft.id}`);
              }
            } catch (updateError) {
              logger.error('Failed to update draft status', {
                draftId: existingDraft.id,
                error: updateError,
                errorMessage: updateError instanceof Error ? updateError.message : 'Unknown error'
              });
              throw new Error(`Database update failed: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
            }
            
            return sendSuccess(res, { 
              draftId: existingDraft.id,
              message: "Reactivated existing draft for product editing"
            });
          }
        }
        
        // Only create new draft if NO existing draft record exists at all
        logger.debug('No existing draft record found, creating new one', {
          productId,
          userId
        });
        
        // Use the working SQL function to create a draft with ALL product data
        const result = await db.execute(
          sql`SELECT * FROM create_product_draft_from_product(${productId}, ${userId})`
        );
        
        if (!result.rows || result.rows.length === 0) {
          throw new Error('Failed to create draft from published product');
        }
        
        const draftRecord = result.rows[0] as any;
        
        logger.debug('Successfully created draft from published product', {
          draftId: draftRecord.id,
          productId: draftRecord.original_product_id,
          name: draftRecord.name
        });
        
        // Load and map product attributes if needed
        if (!draftRecord.attributes || draftRecord.attributes.length === 0) {
          try {
            const productAttributes = await storage.getProductAttributes(productId);
            if (productAttributes?.length) {
              const mappedAttributes = productAttributes.map(pa => ({
                attributeId: pa.attributeId,
                value: pa.textValue || (Array.isArray(pa.selectedOptions) && pa.selectedOptions.length > 0 
                  ? pa.selectedOptions 
                  : []),
                attributeName: pa.attribute?.name || "",
                attributeDisplayName: pa.overrideDisplayName || pa.attribute?.displayName || "",
                attributeType: pa.attribute?.attributeType || "text",
                isRequired: !!pa.isRequired,
                sortOrder: pa.sortOrder || 0,
                overrideDisplayName: pa.overrideDisplayName || null,
                overrideDescription: pa.overrideDescription || null
              }));
              
              await storage.updateProductDraft(draftRecord.id, { attributes: mappedAttributes });
              draftRecord.attributes = mappedAttributes;
            }
          } catch (attrError) {
            logger.error('Error loading product attributes for draft', { 
              error: attrError, 
              productId 
            });
          }
        }
        
        return sendSuccess(res, { 
          draftId: draftRecord.id,
          message: "Draft created from published product with all data hydrated"
        });
        
      } catch (error) {
        logger.error('Error creating draft from published product', { 
          error, 
          productId,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined 
        });
        throw new BadRequestError(`Failed to create draft from published product: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })
  );
}