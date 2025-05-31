/**
 * Complete Product Cleanup Script
 * Deletes all products, drafts, images, and related orders
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { products, productDrafts, productImages, orders, orderItems, cartItems } from './shared/schema.ts';
import { eq, sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString);
const db = drizzle(client);

async function cleanupAllProducts() {
  console.log('🧹 Starting complete product cleanup...');
  
  try {
    // Start transaction
    await db.transaction(async (tx) => {
      console.log('📋 Getting counts before cleanup...');
      
      // Get current counts
      const productCount = await tx.execute(sql`SELECT COUNT(*) as count FROM products`);
      const draftCount = await tx.execute(sql`SELECT COUNT(*) as count FROM product_drafts`);
      const imageCount = await tx.execute(sql`SELECT COUNT(*) as count FROM product_images`);
      const orderCount = await tx.execute(sql`SELECT COUNT(*) as count FROM orders`);
      const orderItemCount = await tx.execute(sql`SELECT COUNT(*) as count FROM order_items`);
      const cartItemCount = await tx.execute(sql`SELECT COUNT(*) as count FROM cart_items`);
      
      console.log(`📊 Before cleanup:
        - Products: ${productCount.rows[0].count}
        - Product Drafts: ${draftCount.rows[0].count}
        - Product Images: ${imageCount.rows[0].count}
        - Orders: ${orderCount.rows[0].count}
        - Order Items: ${orderItemCount.rows[0].count}
        - Cart Items: ${cartItemCount.rows[0].count}`);

      // Step 1: Delete cart items
      console.log('🛒 Deleting cart items...');
      await tx.delete(cartItems);
      
      // Step 2: Delete order items first (foreign key constraint)
      console.log('📦 Deleting order items...');
      await tx.delete(orderItems);
      
      // Step 3: Delete orders
      console.log('📋 Deleting orders...');
      await tx.delete(orders);
      
      // Step 4: Delete product images
      console.log('🖼️  Deleting product images...');
      await tx.delete(productImages);
      
      // Step 5: Delete product drafts
      console.log('📝 Deleting product drafts...');
      await tx.delete(productDrafts);
      
      // Step 6: Delete products
      console.log('🛍️  Deleting products...');
      await tx.delete(products);
      
      // Reset sequences to start from 1
      console.log('🔄 Resetting ID sequences...');
      await tx.execute(sql`ALTER SEQUENCE products_id_seq RESTART WITH 1`);
      await tx.execute(sql`ALTER SEQUENCE product_drafts_id_seq RESTART WITH 1`);
      await tx.execute(sql`ALTER SEQUENCE product_images_id_seq RESTART WITH 1`);
      await tx.execute(sql`ALTER SEQUENCE orders_id_seq RESTART WITH 1`);
      await tx.execute(sql`ALTER SEQUENCE order_items_id_seq RESTART WITH 1`);
      await tx.execute(sql`ALTER SEQUENCE cart_items_id_seq RESTART WITH 1`);
      
      console.log('✅ Database cleanup completed successfully!');
    });
    
    console.log('🎉 Complete product cleanup finished!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the cleanup
cleanupAllProducts()
  .then(() => {
    console.log('✨ All done! Database is now clean.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });