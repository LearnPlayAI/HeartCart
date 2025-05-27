/**
 * Product Publication Service
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

export interface DraftToProductMapping {
  // Core product fields mapped to Drizzle camelCase
  name: string;
  slug: string;
  description: string | null;
  categoryId: number | null;
  price: number;
  salePrice: number | null;
  discount: number | null;
  imageUrl: string | null;
  additionalImages: string[];
  stock: number;
  rating: number | null;
  reviewCount: number;
  isActive: boolean;
  isFeatured: boolean;
  isFlashDeal: boolean;
  soldCount: number;
  supplier: string | null;
  freeShipping: boolean;
  weight: number | null;
  dimensions: string | null;
  brand: string | null;
  tags: string[];
  hasBackgroundRemoved: boolean;
  originalImageObjectKey: string | null;
  costPrice: number;
  catalogId: number | null;
  displayOrder: number;
  createdAt: string;
  flashDealEnd: string | null;
  minimumPrice: number | null;
  minimumOrder: number | null;
  discountLabel: string | null;
  specialSaleText: string | null;
  specialSaleStart: string | null;
  specialSaleEnd: string | null;
  requiredAttributeIds: number[];
}

/**
 * Maps ALL fields from product_drafts to products table format
 */
function mapDraftToProduct(draft: any): DraftToProductMapping {
  logger.debug('Starting complete field mapping for draft', { 
    draftId: draft.id,
    draftRating: draft.rating,
    draftReviewCount: draft.reviewCount,
    allDraftKeys: Object.keys(draft)
  });

  // Calculate discount percentage from markup or direct discount
  let discountPercentage = null;
  if (draft.salePrice && draft.regularPrice && draft.salePrice < draft.regularPrice) {
    discountPercentage = Math.round(((draft.regularPrice - draft.salePrice) / draft.regularPrice) * 100);
  } else if (draft.markupPercentage) {
    discountPercentage = draft.markupPercentage;
  }

  // Process images - first image becomes main, rest become additional
  const imageUrls = draft.imageUrls || [];
  const mainImageUrl = imageUrls.length > 0 ? imageUrls[0] : null;
  const additionalImages = imageUrls.length > 1 ? imageUrls.slice(1) : [];

  // Extract supplier name/ID
  let supplierValue = null;
  if (draft.supplierId) {
    supplierValue = String(draft.supplierId);
  }

  // Extract required attribute IDs
  let requiredAttributeIds: number[] = [];
  if (draft.selectedAttributes && typeof draft.selectedAttributes === 'object') {
    requiredAttributeIds = Object.keys(draft.selectedAttributes).map(id => parseInt(id)).filter(id => !isNaN(id));
  }

  const productData: DraftToProductMapping = {
    // Core identification
    name: draft.name || 'Untitled Product',
    slug: draft.slug || `product-${Date.now()}`,
    description: draft.description || null,
    categoryId: draft.categoryId || null,
    
    // Pricing
    price: parseFloat(String(draft.regularPrice || 0)),
    salePrice: draft.salePrice ? parseFloat(String(draft.salePrice)) : null,
    discount: discountPercentage,
    costPrice: parseFloat(String(draft.costPrice || 0)),
    minimumPrice: draft.minimumPrice ? parseFloat(String(draft.minimumPrice)) : null,
    
    // Images
    image_url: mainImageUrl,
    additional_images: additionalImages,
    has_background_removed: false,
    original_image_object_key: null,
    
    // Inventory
    stock: parseInt(String(draft.stock_level || 0)),
    
    // Status flags
    is_active: Boolean(draft.is_active !== false),
    is_featured: Boolean(draft.is_featured === true),
    is_flash_deal: Boolean(draft.is_flash_deal === true),
    
    // Supplier and shipping
    supplier: supplierValue,
    free_shipping: Boolean(draft.free_shipping === true),
    
    // Physical properties
    weight: draft.weight ? parseFloat(String(draft.weight)) : null,
    dimensions: draft.dimensions || null,
    brand: draft.brand || null,
    
    // Organizational
    catalog_id: draft.catalog_id || null,
    display_order: 999,
    tags: [],
    
    // Sales and promotions
    discount_label: draft.discount_label || null,
    special_sale_text: draft.special_sale_text || null,
    special_sale_start: draft.special_sale_start || null,
    special_sale_end: draft.special_sale_end || null,
    flash_deal_end: draft.flash_deal_end || null,
    
    // Attributes
    required_attribute_ids: requiredAttributeIds,
    
    // Rating and review count from draft
    rating: draft.rating || null,
    review_count: draft.reviewCount || draft.review_count || 0,
    sold_count: 0,
    minimum_order: null,
    created_at: new Date().toISOString()
  };

  logger.debug('Completed field mapping', { 
    draftId: draft.id, 
    mappedFields: Object.keys(productData).length,
    hasImages: imageUrls.length,
    hasAttributes: requiredAttributeIds.length
  });

  return productData;
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

      // 2. Map ALL draft fields to product format
      const productData = mapDraftToProduct(draft);

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
          .values([productData])
          .returning();

        if (!newProduct) {
          throw new Error('Failed to create new product');
        }

        productResult = newProduct;
      }

      // 4. Process product images
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

      // 5. Process product attributes
      if (draft.selected_attributes && Object.keys(draft.selected_attributes).length > 0) {
        logger.debug('Processing product attributes', { 
          productId: productResult.id,
          attributeCount: Object.keys(draft.selected_attributes).length 
        });

        // Clear existing attributes for this product
        await tx
          .delete(productAttributes)
          .where(eq(productAttributes.productId, productResult.id));

        // Insert selected attributes
        for (const [attributeId, selectedOptions] of Object.entries(draft.selected_attributes)) {
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

      // 6. Update draft status to published
      await tx
        .update(productDrafts)
        .set({
          draft_status: 'published',
          original_product_id: productResult.id,
          published_at: new Date().toISOString(),
          published_version: (draft.published_version || 0) + 1,
          last_modified: new Date().toISOString()
        })
        .where(eq(productDrafts.id, draftId));

      logger.info('Product publication completed successfully', { 
        draftId,
        productId: productResult.id,
        isUpdate: !!draft.original_product_id 
      });

      return {
        success: true,
        productId: productResult.id
      };

    } catch (error) {
      logger.error('Product publication failed - transaction rolled back', { 
        draftId,
        error: error instanceof Error ? error.message : String(error)
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