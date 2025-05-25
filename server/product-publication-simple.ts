/**
 * SIMPLE Working Product Publication Service
 * 
 * Ultra-minimal approach that just creates a basic product record.
 * No complex mappings, no transactions, just basic insertion.
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
  try {
    logger.info('Starting SIMPLE product publication', { draftId });

    // Get the draft with the simplest possible query
    const draftRows = await db.execute(sql`
      SELECT name, slug, description, category_id, regular_price, cost_price, 
             sale_price, supplier_id, catalog_id, image_urls, is_active
      FROM product_drafts 
      WHERE id = ${draftId}
    `);

    if (!draftRows.rows[0]) {
      return { success: false, error: 'Draft not found' };
    }

    const draft = draftRows.rows[0] as any;
    logger.info('Draft found, inserting product', { draftId, name: draft.name });

    // Insert product with the absolute minimum required fields
    const productRows = await db.execute(sql`
      INSERT INTO products (name, slug, description, category_id, price, cost_price, sale_price, supplier, catalog_id, image_url, is_active, stock, rating, review_count, sold_count)
      VALUES (
        ${draft.name || 'New Product'},
        ${draft.slug || `product-${Date.now()}`},
        ${draft.description || ''},
        ${draft.category_id || null},
        ${parseFloat(draft.regular_price) || 0},
        ${parseFloat(draft.cost_price) || 0},
        ${draft.sale_price ? parseFloat(draft.sale_price) : null},
        ${draft.supplier_id || null},
        ${draft.catalog_id || null},
        ${draft.image_urls && draft.image_urls[0] ? draft.image_urls[0] : null},
        ${draft.is_active !== false},
        0,
        0,
        0,
        0
      )
      RETURNING id
    `);

    const productId = (productRows.rows[0] as any).id;
    logger.info('Product created successfully', { productId });

    // Update draft status
    await db.execute(sql`
      UPDATE product_drafts 
      SET draft_status = 'published', original_product_id = ${productId}
      WHERE id = ${draftId}
    `);

    logger.info('Publication completed successfully', { draftId, productId });

    return {
      success: true,
      productId: productId
    };

  } catch (error) {
    logger.error('Simple publication failed', { 
      draftId, 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Publication failed'
    };
  }
}