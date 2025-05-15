import { eq } from 'drizzle-orm';
import { db } from './db';
import { products, productDrafts, productAttributes, productImages } from '@shared/schema';
import { logger } from './logger';

export async function publishProductDraft(id: number): Promise<any | undefined> {
  try {
    // Get the draft first (outside transaction)
    const [draft] = await db
      .select()
      .from(productDrafts)
      .where(eq(productDrafts.id, id));
      
    if (!draft) {
      return undefined;
    }
    
    // Log draft data for debugging
    logger.debug('Publishing product draft', { 
      draftId: id, 
      originalProductId: draft.originalProductId
    });
    
    // Use drizzle-orm transaction correctly with the correct API
    return await db.transaction(async (tx) => {
      // Simple logic to create or update product
      let product;
      
      if (draft.originalProductId) {
        // Update existing product
        const [updatedProduct] = await tx
          .update(products)
          .set({
            name: draft.name || '',
            slug: draft.slug || '',
            description: draft.description,
            categoryId: draft.categoryId,
            price: typeof draft.regularPrice === 'string' ? parseFloat(draft.regularPrice) : draft.regularPrice || 0,
            costPrice: typeof draft.costPrice === 'string' ? parseFloat(draft.costPrice) : draft.costPrice || 0,
            salePrice: draft.salePrice ? (typeof draft.salePrice === 'string' ? parseFloat(draft.salePrice) : draft.salePrice) : null,
            stock: draft.stockLevel ? (typeof draft.stockLevel === 'string' ? parseInt(draft.stockLevel, 10) : draft.stockLevel) : 0,
            isActive: draft.isActive,
            isFeatured: draft.isFeatured || false,
            brand: draft.brand,
            supplierId: draft.supplierId,
            catalogId: draft.catalogId,
            metaTitle: draft.metaTitle,
            metaDescription: draft.metaDescription,
            tags: draft.metaKeywords ? [draft.metaKeywords] : []
          })
          .where(eq(products.id, draft.originalProductId))
          .returning();
          
        product = updatedProduct;
      } else {
        // Create new product
        const [newProduct] = await tx
          .insert(products)
          .values({
            name: draft.name || '',
            slug: draft.slug || '',
            description: draft.description,
            categoryId: draft.categoryId,
            price: typeof draft.regularPrice === 'string' ? parseFloat(draft.regularPrice) : draft.regularPrice || 0,
            costPrice: typeof draft.costPrice === 'string' ? parseFloat(draft.costPrice) : draft.costPrice || 0,
            salePrice: draft.salePrice ? (typeof draft.salePrice === 'string' ? parseFloat(draft.salePrice) : draft.salePrice) : null,
            stock: draft.stockLevel ? (typeof draft.stockLevel === 'string' ? parseInt(draft.stockLevel, 10) : draft.stockLevel) : 0,
            isActive: draft.isActive,
            isFeatured: draft.isFeatured || false,
            brand: draft.brand,
            supplierId: draft.supplierId,
            catalogId: draft.catalogId,
            metaTitle: draft.metaTitle,
            metaDescription: draft.metaDescription,
            tags: draft.metaKeywords ? [draft.metaKeywords] : []
          })
          .returning();
          
        product = newProduct;
      }
      
      // Delete the draft as part of the transaction
      await tx
        .delete(productDrafts)
        .where(eq(productDrafts.id, draft.id));
      
      // Return the product
      return product;
    });
  } catch (error) {
    logger.error('Error publishing product draft', { error, id });
    throw error;
  }
}