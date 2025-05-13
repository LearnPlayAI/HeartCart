/**
 * Update Product Catalog Association Script
 * 
 * This script is used to fix products that were created without proper catalog and supplier associations.
 * It updates the product records in the database and optionally fixes image paths in the object store.
 */

import { db } from "../server/db";
import { products, catalogs, suppliers, categories } from "../shared/schema";
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
      // Use supplier instead of supplierId to match schema
      supplier: supplier?.name || null
    })
    .where(eq(products.id, productId));
  
  console.log(`Updated product ${product.name} with catalogId=${catalogId} and supplier=${supplier?.name || 'null'}`);
  
  // Step 5: Fix images if requested
  if (fixImages) {
    // Check if the product has images
    if (product.imageUrl) {
      console.log(`Fixing images for product ${product.name}...`);
      await fixProductImages(
        productId, 
        product.name, 
        product.categoryId, 
        catalog.name, 
        supplier?.name || 'default-supplier'
      );
    } else {
      console.log(`Product ${product.name} has no imageUrl, skipping image fix.`);
    }
  }
}

/**
 * Fix product images by updating the database records to point to the correct paths
 * Note: This doesn't actually move files, but rather updates the database references
 * which is more practical in the Replit environment where we might not have full
 * file listing capabilities.
 */
async function fixProductImages(
  productId: number, 
  productName: string, 
  categoryId: number | null,
  catalogName: string,
  supplierName: string
) {
  try {
    // Get category info from database
    const category = categoryId 
      ? await db.query.categories.findFirst({
          where: eq(categories.id, categoryId)
        })
      : null;
    
    const categoryName = category?.name || 'uncategorized';
    const sanitizedProductName = productName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    
    // Step 1: First check if there are product images in the product_images table
    const productImageRecords = await db.select().from(productImages).where(eq(productImages.productId, productId));
    
    if (productImageRecords && productImageRecords.length > 0) {
      console.log(`Found ${productImageRecords.length} images for product ${productId}`);
      
      // Create the new path with correct supplier and catalog
      const sanitizedSupplier = supplierName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const sanitizedCatalog = catalogName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      
      for (const image of productImageRecords) {
        let needsUpdate = false;
        let newUrl = image.url;
        let newObjectKey = image.objectKey;
        
        // Fix any URLs that have /api/files/ prefix (they shouldn't)
        if (image.url && image.url.startsWith('/api/files/')) {
          newUrl = image.url.replace('/api/files/', '');
          needsUpdate = true;
        }
        
        // Fix unknown supplier/catalog in URLs
        if (image.url && image.url.includes('unknown-supplier/unknown-catalog')) {
          newUrl = image.url.replace(
            'unknown-supplier/unknown-catalog', 
            `${sanitizedSupplier}/${sanitizedCatalog}`
          );
          needsUpdate = true;
        }
        
        // Fix unknown supplier/catalog in object keys
        if (image.objectKey && image.objectKey.includes('unknown-supplier/unknown-catalog')) {
          newObjectKey = image.objectKey.replace(
            'unknown-supplier/unknown-catalog', 
            `${sanitizedSupplier}/${sanitizedCatalog}`
          );
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          // Update the image record
          await db.update(productImages)
            .set({ 
              url: newUrl,
              objectKey: newObjectKey 
            })
            .where(eq(productImages.id, image.id));
          
          console.log(`Updated image ${image.id}: ${newUrl}`);
        }
      }
    } else {
      console.log(`No product_images found for product ${productId}`);
      
      // Get the product to check main image URL field
      const [product] = await db.select().from(products).where(eq(products.id, productId));
      
      if (!product) {
        console.error(`Product with ID ${productId} not found`);
        return;
      }
      
      // Check if the product has an image URL with "unknown-supplier/unknown-catalog"
      if (!product.imageUrl) {
        console.log('Product has no imageUrl, skipping image fix.');
        return;
      }
      
      let needsUpdate = false;
      let newImageUrl = product.imageUrl;
      
      if (product.imageUrl.includes('unknown-supplier/unknown-catalog')) {
        // Create the new path with correct supplier and catalog
        const sanitizedSupplier = supplierName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const sanitizedCatalog = catalogName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        
        // Replace in main image URL
        newImageUrl = product.imageUrl.replace(
          'unknown-supplier/unknown-catalog', 
          `${sanitizedSupplier}/${sanitizedCatalog}`
        );
        
        needsUpdate = true;
      }
      
      // Fix any URLs that have /api/files/ prefix (they shouldn't)
      if (newImageUrl.startsWith('/api/files/')) {
        newImageUrl = newImageUrl.replace('/api/files/', '');
        needsUpdate = true;
      }
      
      // Update additional images if they exist
      let newAdditionalImages = product.additionalImages || [];
      if (Array.isArray(product.additionalImages) && product.additionalImages.length > 0) {
        let additionalImagesUpdated = false;
        
        newAdditionalImages = product.additionalImages.map(url => {
          let newUrl = url;
          
          // Fix unknown supplier/catalog
          if (url.includes('unknown-supplier/unknown-catalog')) {
            newUrl = url.replace(
              'unknown-supplier/unknown-catalog', 
              `${sanitizedSupplier}/${sanitizedCatalog}`
            );
            additionalImagesUpdated = true;
          }
          
          // Fix /api/files/ prefix
          if (newUrl.startsWith('/api/files/')) {
            newUrl = newUrl.replace('/api/files/', '');
            additionalImagesUpdated = true;
          }
          
          return newUrl;
        });
        
        if (additionalImagesUpdated) {
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        // Update the product's image URLs in the database
        await db.update(products)
          .set({ 
            imageUrl: newImageUrl,
            additionalImages: newAdditionalImages
          })
          .where(eq(products.id, productId));
        
        console.log(`Updated product image URLs. New main image: ${newImageUrl}`);
      } else {
        console.log('No image URL updates needed for this product');
      }
    }
  } catch (error) {
    console.error(`Error fixing images for product ${productId}:`, error);
  }
}

// Direct script execution function
async function main() {
  const productId = process.argv[2] ? parseInt(process.argv[2]) : null;
  const catalogId = process.argv[3] ? parseInt(process.argv[3]) : null;
  const fixImages = process.argv[4] === 'true';
  
  if (!productId || !catalogId) {
    console.error('Usage: tsx scripts/update-product-catalog.ts <productId> <catalogId> [fixImages]');
    console.error('Example: tsx scripts/update-product-catalog.ts 34 1 true');
    process.exit(1);
  }
  
  try {
    await updateProductCatalog(productId, catalogId, fixImages);
    console.log('Product catalog association updated successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating product catalog association:', error);
    process.exit(1);
  }
}

// Run if this is being executed directly
if (process.argv[1].includes('update-product-catalog')) {
  main();
}

export default updateProductCatalog;