/**
 * MINIMAL Working Product Publication Service
 * 
 * Completely bypasses all ORM issues with direct SQL only.
 * Gets basic product creation working without complex mappings.
 */

import { db } from "./db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export interface PublicationResult {
  success: boolean;
  productId?: number;
  error?: string;
}

export async function publishProductDraft(draftId: number): Promise<PublicationResult> {
  logger.info('Starting minimal product publication', { draftId });

  try {
    // Get draft data with raw SQL
    const draftResult = await db.execute(sql`SELECT * FROM product_drafts WHERE id = ${draftId}`);
    const draft = draftResult.rows[0] as any;

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    logger.info('Found draft, creating product', { draftId, name: draft.name });

    // Create product with raw SQL - only essential fields
    const productInsertResult = await db.execute(sql`
      INSERT INTO products (
        name, slug, description, category_id, price, sale_price, 
        image_url, stock, is_active, supplier, cost_price, catalog_id
      ) VALUES (
        ${draft.name || 'Untitled Product'},
        ${draft.slug || `product-${Date.now()}`},
        ${draft.description},
        ${draft.category_id},
        ${parseFloat(String(draft.regular_price || 0))},
        ${draft.sale_price ? parseFloat(String(draft.sale_price)) : null},
        ${draft.image_urls && draft.image_urls.length > 0 ? draft.image_urls[0] : null},
        ${parseInt(String(draft.stock_level || 0))},
        ${draft.is_active !== false},
        ${draft.supplier_id ? String(draft.supplier_id) : null},
        ${parseFloat(String(draft.cost_price || 0))},
        ${draft.catalog_id}
      ) RETURNING id
    `);

    const productId = (productInsertResult.rows[0] as any).id;
    logger.info('Product created successfully', { productId });

    // Update draft status with raw SQL
    await db.execute(sql`
      UPDATE product_drafts 
      SET draft_status = 'published', 
          original_product_id = ${productId},
          published_version = COALESCE(published_version, 0) + 1
      WHERE id = ${draftId}
    `);

    logger.info('Draft status updated, publication complete', { draftId, productId });

    return {
      success: true,
      productId: productId
    };

  } catch (error) {
    logger.error('Minimal publication failed', { 
      draftId, 
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Publication failed'
    };
  }
}