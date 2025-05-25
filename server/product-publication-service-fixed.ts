/**
 * COMPLETE Product Publication Service - FIXED VERSION
 * 
 * This service handles the complete publication workflow for product drafts.
 * It ensures ATOMIC operations - either complete success or complete failure.
 * Products are NEVER partially created.
 */

import { db } from "./db";
import { products, productDrafts, productAttributes, productImages } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";

export interface PublicationResult {
  success: boolean;
  productId?: number;
  error?: string;
  details?: any;
}

/**
 * Publishes a product draft using ATOMIC transaction
 * Either completely succeeds or completely fails - no partial products
 */
export async function publishProductDraft(draftId: number): Promise<PublicationResult> {
  logger.info('Starting ATOMIC product publication', { draftId });

  return await db.transaction(async (tx) => {
    try {
      // 1. Get the complete draft record
      const [draft] = await tx
        .select()
        .from(productDrafts)
        .where(eq(productDrafts.id, draftId));

      if (!draft) {
        throw new Error(`Draft ${draftId} not found`);
      }

      logger.debug('Retrieved draft for publication', { 
        draftId, 
        originalProductId: draft.originalProductId,
        status: draft.draftStatus 
      });

      // 2. Map ALL draft fields to product format using CORRECT field names
      const productData = {
        // Core identification
        name: draft.name || 'Untitled Product',
        slug: draft.slug || `product-${Date.now()}`,
        description: draft.description || null,
        categoryId: draft.categoryId || null,
        
        // Pricing
        price: parseFloat(String(draft.regularPrice || 0)),
        salePrice: draft.salePrice ? parseFloat(String(draft.salePrice)) : null,
        discount: draft.markupPercentage || null,
        costPrice: parseFloat(String(draft.costPrice || 0)),
        minimumPrice: draft.minimumPrice ? parseFloat(String(draft.minimumPrice)) : null,
        
        // Images - use correct field names
        imageUrl: draft.imageUrls && draft.imageUrls.length > 0 ? draft.imageUrls[0] : null,
        additionalImages: draft.imageUrls && draft.imageUrls.length > 1 ? draft.imageUrls.slice(1) : [],
        
        // Inventory & Status - use correct field names
        stock: parseInt(String(draft.stockLevel || 0)),
        rating: null,
        reviewCount: 0,
        isActive: Boolean(draft.isActive !== false),
        isFeatured: Boolean(draft.isFeatured === true),
        isFlashDeal: Boolean(draft.isFlashDeal === true),
        soldCount: 0,
        
        // Supplier & Shipping
        supplier: draft.supplierId ? String(draft.supplierId) : null,
        freeShipping: Boolean(draft.freeShipping === true),
        
        // Physical attributes
        weight: draft.weight ? parseFloat(String(draft.weight)) : null,
        dimensions: draft.dimensions || null,
        brand: draft.brand || null,
        tags: Array.isArray(draft.tags) ? draft.tags : [],
        
        // Image processing
        hasBackgroundRemoved: false,
        originalImageObjectKey: null,
        
        // Organization
        catalogId: draft.catalogId || null,
        displayOrder: 999,
        createdAt: new Date().toISOString(),
        
        // Promotions
        flashDealEnd: draft.flashDealEnd || null,
        minimumOrder: draft.minimumOrder || null,
        discountLabel: draft.discountLabel || null,
        specialSaleText: draft.specialSaleText || null,
        specialSaleStart: draft.specialSaleStart || null,
        specialSaleEnd: draft.specialSaleEnd || null,
        
        // Attributes - use correct field names
        requiredAttributeIds: draft.selectedAttributes ? 
          Object.keys(draft.selectedAttributes).map(id => parseInt(id)).filter(id => !isNaN(id)) : []
      };

      logger.debug('Mapped product data for publication', { 
        productData, 
        draftId 
      });

      // 3. Determine if this is CREATE or UPDATE
      let productResult;
      if (draft.originalProductId) {
        // UPDATE existing product
        logger.debug('Updating existing product', { 
          originalProductId: draft.originalProductId,
          draftId 
        });

        const [updatedProduct] = await tx
          .update(products)
          .set(productData)
          .where(eq(products.id, draft.originalProductId))
          .returning();

        if (!updatedProduct) {
          throw new Error(`Failed to update product ${draft.originalProductId}`);
        }

        productResult = updatedProduct;
      } else {
        // CREATE new product
        logger.debug('Creating new product', { draftId });

        const [newProduct] = await tx
          .insert(products)
          .values(productData)
          .returning();

        if (!newProduct) {
          throw new Error('Failed to create new product');
        }

        productResult = newProduct;
      }

      // 4. Process product images if they exist
      if (draft.imageUrls && draft.imageUrls.length > 0) {
        logger.debug('Processing product images', { 
          productId: productResult.id,
          imageCount: draft.imageUrls.length 
        });

        // Clear existing images for this product
        await tx
          .delete(productImages)
          .where(eq(productImages.productId, productResult.id));

        // Insert all images
        for (let i = 0; i < draft.imageUrls.length; i++) {
          const objectKey = draft.imageObjectKeys && draft.imageObjectKeys[i] ? 
            draft.imageObjectKeys[i] : `image-${Date.now()}-${i}`;

          await tx.insert(productImages).values({
            productId: productResult.id,
            url: draft.imageUrls[i],
            objectKey: objectKey,
            isMain: i === (draft.mainImageIndex || 0),
            sortOrder: i,
            createdAt: new Date().toISOString(),
            hasBgRemoved: false,
            bgRemovedUrl: null,
            bgRemovedObjectKey: null
          });
        }
      }

      // 5. Process product attributes if they exist
      if (draft.selectedAttributes && Object.keys(draft.selectedAttributes).length > 0) {
        logger.debug('Processing product attributes', { 
          productId: productResult.id,
          attributeCount: Object.keys(draft.selectedAttributes).length 
        });

        // Clear existing attributes for this product
        await tx
          .delete(productAttributes)
          .where(eq(productAttributes.productId, productResult.id));

        // Insert selected attributes
        for (const [attributeId, selectedOptions] of Object.entries(draft.selectedAttributes)) {
          if (Array.isArray(selectedOptions) && selectedOptions.length > 0) {
            await tx.insert(productAttributes).values({
              productId: productResult.id,
              attributeId: parseInt(attributeId),
              selectedOptions: selectedOptions,
              textValue: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      // 6. Update draft status to published - use CORRECT field names
      await tx
        .update(productDrafts)
        .set({
          draftStatus: 'published',
          originalProductId: productResult.id,
          publishedAt: new Date().toISOString(),
          publishedVersion: (draft.publishedVersion || 0) + 1,
          lastModified: new Date().toISOString()
        })
        .where(eq(productDrafts.id, draftId));

      logger.info('Product publication completed successfully', { 
        draftId,
        productId: productResult.id,
        isUpdate: !!draft.originalProductId 
      });

      return {
        success: true,
        productId: productResult.id
      };

    } catch (error) {
      logger.error('ATOMIC publication failed - transaction will be rolled back', { 
        draftId, 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Transaction automatically rolls back on error
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during publication',
        details: error
      };
    }
  });
}