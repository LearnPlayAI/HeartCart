/**
 * SIMPLE Working Product Publication Service
 * 
 * This service focuses on getting basic product publication working
 * without complex field mappings that are causing SQL errors.
 */

import { db } from "./db";
import { products, productDrafts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export interface PublicationResult {
  success: boolean;
  productId?: number;
  error?: string;
}

/**
 * Publishes a product draft with minimal field mapping to avoid SQL errors
 */
export async function publishProductDraft(draftId: number): Promise<PublicationResult> {
  logger.info('Starting simple product publication', { draftId });

  return await db.transaction(async (tx) => {
    try {
      // 1. Get the draft
      const [draft] = await tx
        .select()
        .from(productDrafts)
        .where(eq(productDrafts.id, draftId));

      if (!draft) {
        throw new Error(`Draft ${draftId} not found`);
      }

      // 2. Create basic product data using only required fields
      const productData = {
        name: draft.name || 'Untitled Product',
        slug: draft.slug || `product-${Date.now()}`,
        description: draft.description,
        categoryId: draft.categoryId,
        price: parseFloat(String(draft.regularPrice || 0)),
        salePrice: draft.salePrice ? parseFloat(String(draft.salePrice)) : null,
        discount: draft.markupPercentage,
        imageUrl: draft.imageUrls && draft.imageUrls.length > 0 ? draft.imageUrls[0] : null,
        additionalImages: draft.imageUrls && draft.imageUrls.length > 1 ? draft.imageUrls.slice(1) : [],
        stock: parseInt(String(draft.stockLevel || 0)),
        rating: null,
        reviewCount: 0,
        isActive: Boolean(draft.isActive !== false),
        isFeatured: Boolean(draft.isFeatured === true),
        isFlashDeal: Boolean(draft.isFlashDeal === true),
        soldCount: 0,
        supplier: draft.supplierId ? String(draft.supplierId) : null,
        freeShipping: Boolean(draft.freeShipping === true),
        weight: draft.weight ? parseFloat(String(draft.weight)) : null,
        dimensions: draft.dimensions,
        brand: draft.brand,
        tags: [],
        hasBackgroundRemoved: false,
        originalImageObjectKey: null,
        costPrice: parseFloat(String(draft.costPrice || 0)),
        catalogId: draft.catalogId,
        displayOrder: 999
      };

      // 3. Create or update product
      let productResult;
      if (draft.originalProductId) {
        // UPDATE existing product
        const [updatedProduct] = await tx
          .update(products)
          .set(productData)
          .where(eq(products.id, draft.originalProductId))
          .returning();
        productResult = updatedProduct;
      } else {
        // CREATE new product
        const [newProduct] = await tx
          .insert(products)
          .values(productData)
          .returning();
        productResult = newProduct;
      }

      if (!productResult) {
        throw new Error('Failed to create/update product');
      }

      // 4. Update draft status
      await tx
        .update(productDrafts)
        .set({
          draftStatus: 'published',
          originalProductId: productResult.id,
          publishedVersion: (draft.publishedVersion || 0) + 1
        })
        .where(eq(productDrafts.id, draftId));

      logger.info('Product publication completed successfully', { 
        draftId,
        productId: productResult.id
      });

      return {
        success: true,
        productId: productResult.id
      };

    } catch (error) {
      logger.error('Simple publication failed', { 
        draftId, 
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during publication'
      };
    }
  });
}