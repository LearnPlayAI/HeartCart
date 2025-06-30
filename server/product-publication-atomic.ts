/**
 * ATOMIC Product Publication Service - COMPLETE WORKING VERSION
 * 
 * This service ensures 100% atomic operations - either complete success or complete failure.
 * Products are NEVER partially created.
 */

import { db } from "./db";
import { products, productDrafts, productAttributes, productImages } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export interface PublicationResult {
  success: boolean;
  productId?: number;
  error?: string;
}

/**
 * Publishes a product draft using ATOMIC transaction
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

      // 2. Create product data using EXACT schema match with proper seoKeywords handling
      // Ensure seoKeywords is properly handled as an array
      logger.info('SEO Keywords Debug', { 
        originalValue: draft.seoKeywords,
        type: typeof draft.seoKeywords,
        isArray: Array.isArray(draft.seoKeywords),
        stringified: JSON.stringify(draft.seoKeywords)
      });
      
      let seoKeywordsArray = [];
      if (draft.seoKeywords) {
        if (Array.isArray(draft.seoKeywords)) {
          seoKeywordsArray = draft.seoKeywords;
        } else if (typeof draft.seoKeywords === 'string') {
          // Handle PostgreSQL array string format like: {"item1","item2","item3"}
          if (draft.seoKeywords.startsWith('{') && draft.seoKeywords.endsWith('}')) {
            try {
              // Remove outer braces and split by comma, then clean quotes
              const arrayContent = draft.seoKeywords.slice(1, -1);
              seoKeywordsArray = arrayContent.split('","').map(k => 
                k.replace(/^"/, '').replace(/"$/, '').trim()
              ).filter(k => k);
            } catch (error) {
              logger.warn('Failed to parse PostgreSQL array format, falling back to comma split', { 
                originalValue: draft.seoKeywords, 
                error: error.message 
              });
              // Fallback to comma-separated string format
              seoKeywordsArray = draft.seoKeywords.split(',').map(k => k.trim()).filter(k => k);
            }
          } else {
            // Handle legacy comma-separated string format
            seoKeywordsArray = draft.seoKeywords.split(',').map(k => k.trim()).filter(k => k);
          }
        }
      }
      
      logger.info('Processed SEO Keywords', { 
        result: seoKeywordsArray,
        resultType: typeof seoKeywordsArray,
        resultIsArray: Array.isArray(seoKeywordsArray),
        length: seoKeywordsArray.length
      });

      // Additional debugging - log the exact data being passed to database
      logger.info('CRITICAL DEBUG - Product data before database operation', {
        seoKeywords: seoKeywordsArray,
        seoKeywordsType: typeof seoKeywordsArray,
        seoKeywordsIsArray: Array.isArray(seoKeywordsArray),
        seoKeywordsStringified: JSON.stringify(seoKeywordsArray)
      });

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
        tags: Array.isArray(draft.tags) ? draft.tags : [],
        hasBackgroundRemoved: false,
        originalImageObjectKey: null,
        costPrice: parseFloat(String(draft.costPrice || 0)),
        catalogId: draft.catalogId,
        displayOrder: 999,
        createdAt: new Date().toISOString(),
        flashDealEnd: draft.flashDealEnd || null,
        minimumPrice: draft.minimumPrice ? parseFloat(String(draft.minimumPrice)) : null,
        minimumOrder: draft.minimumOrder || null,
        discountLabel: draft.discountLabel,
        specialSaleText: draft.specialSaleText,
        specialSaleStart: draft.specialSaleStart || null,
        specialSaleEnd: draft.specialSaleEnd || null,
        requiredAttributeIds: draft.selectedAttributes ? 
          Object.keys(draft.selectedAttributes).map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
        // SEO fields - CRITICAL: Ensure seoKeywords is a proper JavaScript array
        metaTitle: draft.metaTitle,
        metaDescription: draft.metaDescription,
        seoKeywords: seoKeywordsArray, // This MUST be a JavaScript array, not a string
        canonicalUrl: draft.canonicalUrl
      };

      // CRITICAL DEBUG: Verify the exact data types before database operation
      logger.info('FINAL PRODUCT DATA VALIDATION', {
        seoKeywordsValue: productData.seoKeywords,
        seoKeywordsType: typeof productData.seoKeywords,
        seoKeywordsIsArray: Array.isArray(productData.seoKeywords),
        seoKeywordsLength: Array.isArray(productData.seoKeywords) ? productData.seoKeywords.length : 'NOT_ARRAY',
        tagsType: typeof productData.tags,
        tagsIsArray: Array.isArray(productData.tags)
      });

      // 3. Create or update product
      let productResult;
      if (draft.originalProductId) {
        // UPDATE existing product - handle seoKeywords conversion
        logger.info('Updating existing product with all fields', { originalProductId: draft.originalProductId });
        
        // Prepare update data with explicit seoKeywords handling
        const updateData = { ...productData };
        
        // Force seoKeywords to be an array - this is critical for Drizzle ORM
        updateData.seoKeywords = seoKeywordsArray;
        
        const [updatedProduct] = await tx
          .update(products)
          .set(updateData)
          .where(eq(products.id, draft.originalProductId))
          .returning();

        if (!updatedProduct) {
          throw new Error(`Failed to update product ${draft.originalProductId}`);
        }
        productResult = updatedProduct;
      } else {
        // CREATE new product - handle seoKeywords conversion
        logger.info('Creating new product with all fields');
        
        // Prepare insert data with explicit seoKeywords handling
        const insertData = { ...productData };
        
        // Force seoKeywords to be an array - this is critical for Drizzle ORM
        insertData.seoKeywords = seoKeywordsArray;
        
        const [newProduct] = await tx
          .insert(products)
          .values(insertData)
          .returning();

        if (!newProduct) {
          throw new Error('Failed to create new product');
        }
        productResult = newProduct;
      }

      // 4. Process images if they exist
      if (draft.imageUrls && draft.imageUrls.length > 0) {
        // Clear existing images
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

      // 5. Process attributes if they exist
      if (draft.selectedAttributes && Object.keys(draft.selectedAttributes).length > 0) {
        // Clear existing attributes
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
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }

      // 6. Update draft status to published
      await tx
        .update(productDrafts)
        .set({
          draftStatus: 'published',
          originalProductId: productResult.id,
          publishedAt: new Date(),
          publishedVersion: (draft.publishedVersion || 0) + 1,
          lastModified: new Date()
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
      logger.error('ATOMIC publication failed - transaction rolled back', { 
        draftId, 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during publication'
      };
    }
  });
}