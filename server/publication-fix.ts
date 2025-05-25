import { db } from "./db";
import { products, productImages, productAttributes } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Simplified publication process to avoid database connection timeouts
 * This breaks down the complex publication into smaller, manageable operations
 */
export async function publishProductDraftSimplified(draft: any): Promise<any> {
  try {
    logger.info("Starting simplified publication process", { draftId: draft.id });

    // Step 1: Create basic product data (minimal required fields only)
    const basicProductData = {
      name: draft.name || "Untitled Product",
      slug: draft.slug || `product-${Date.now()}`,
      description: draft.description || "",
      categoryId: draft.categoryId || 11, // Default to first available category
      price: parseFloat(String(draft.regularPrice || 0)),
      costPrice: parseFloat(String(draft.costPrice || 0)),
      stock: parseInt(String(draft.stockLevel || 0)),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Step 2: Insert the product
    const [newProduct] = await db
      .insert(products)
      .values(basicProductData)
      .returning();

    logger.info("Product created successfully", { 
      productId: newProduct.id, 
      name: newProduct.name 
    });

    // Step 3: Add main image if available (single operation)
    if (draft.imageUrls && draft.imageUrls.length > 0) {
      try {
        await db.insert(productImages).values({
          productId: newProduct.id,
          url: draft.imageUrls[0],
          isMain: true,
          sortOrder: 0
        });
        logger.info("Main image added", { productId: newProduct.id });
      } catch (imageError) {
        logger.warn("Failed to add image, continuing without it", { 
          error: imageError, 
          productId: newProduct.id 
        });
      }
    }

    return newProduct;
  } catch (error) {
    logger.error("Error in simplified publication", { error, draftId: draft.id });
    throw error;
  }
}