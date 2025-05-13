/**
 * Update Product Catalog Association Script
 * 
 * This script is used to fix products that were created without proper catalog and supplier associations.
 * It updates the product records in the database and optionally fixes image paths in the object store.
 */

import { db } from "../server/db";
import { products, catalogs, suppliers } from "../shared/schema";
import { eq } from "drizzle-orm";
import { objectStoreAdapter } from "../server/object-store-adapter";

async function updateProductCatalog(productId: number, catalogId: number, fixImages: boolean = false) {
  // Step 1: Get product info
  const [product] = await db.select().from(products).where(eq(products.id, productId));
  
  if (!product) {
    console.error(`Product with ID ${productId} not found.`);
    return;
  }
  
  console.log(`Found product: ${product.name} (ID: ${product.id})`);
  
  // Step 2: Get catalog info
  const [catalog] = await db.select().from(catalogs).where(eq(catalogs.id, catalogId));
  
  if (!catalog) {
    console.error(`Catalog with ID ${catalogId} not found.`);
    return;
  }
  
  console.log(`Found catalog: ${catalog.name} (ID: ${catalog.id})`);
  
  // Step 3: Get supplier info
  const [supplier] = catalog.supplierId 
    ? await db.select().from(suppliers).where(eq(suppliers.id, catalog.supplierId))
    : [];
  
  if (!supplier && catalog.supplierId) {
    console.warn(`Supplier with ID ${catalog.supplierId} not found despite being referenced by catalog.`);
  } else if (supplier) {
    console.log(`Found supplier: ${supplier.name} (ID: ${supplier.id})`);
  }
  
  // Step 4: Update product record
  await db.update(products)
    .set({ 
      catalogId: catalogId,
      supplierId: supplier?.id || null
    })
    .where(eq(products.id, productId));
  
  console.log(`Updated product ${product.name} with catalogId=${catalogId} and supplierId=${supplier?.id || 'null'}`);
  
  // Step 5: Fix images if requested
  if (fixImages && product.imageUrl) {
    console.log(`Fixing images for product ${product.name}...`);
    await fixProductImages(
      productId, 
      product.name, 
      product.categoryId, 
      catalog.name, 
      supplier?.name || 'default-supplier'
    );
  }
}

/**
 * Fix product images by moving them from the unknown-supplier/unknown-catalog path
 * to the correct supplier/catalog path
 */
async function fixProductImages(
  productId: number, 
  productName: string, 
  categoryId: number | null,
  catalogName: string,
  supplierName: string
) {
  try {
    // Get category info
    const [category] = categoryId 
      ? await db.select().from({ c: catalogs }).where(eq(c => c.id, categoryId || 0))
      : [];
    
    const categoryName = category?.name || 'uncategorized';
    const sanitizedProductName = productName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    
    // Source path with unknown supplier/catalog
    const sourcePathPrefix = `unknown-supplier/unknown-catalog/${categoryName}/${sanitizedProductName}_${productId}/`;
    
    // Get all files in this path
    // Note: This would require listing files which may not be directly supported
    // by the object store adapter. This is a placeholder for the actual implementation.
    
    console.log(`Would fix images from ${sourcePathPrefix} to correct supplier/catalog paths.`);
    console.log(`This requires implementation-specific file listing support from the object store.`);
    
    // Implementation would:
    // 1. List all files in the source path
    // 2. For each file, create a new path with correct supplier/catalog
    // 3. Copy content from old to new path
    // 4. Update product record with new image paths
  } catch (error) {
    console.error(`Error fixing images for product ${productId}:`, error);
  }
}

// Usage example (uncomment to use)
// Call this function with the product ID and catalog ID you want to associate
// updateProductCatalog(34, 1, true);  // Specify product 34, catalog 1, and fix images

export default updateProductCatalog;