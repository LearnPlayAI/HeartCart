/**
 * Clear All Transactional Data - Keep Core System Data
 * Removes orders, cart items, email logs, tokens, and commission data
 * Preserves users, products, categories, and system configuration
 */

import { pool } from './server/db.ts';

async function clearTransactionalData() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting transactional data cleanup...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Tables to clear (transactional data)
    const tablesToClear = [
      // Order-related tables
      'orderStatusHistory',
      'orderItems', 
      'orders',
      
      // Cart and shopping data
      'cart_items',
      'abandonedCarts',
      'userFavourites',
      'productInteractions',
      
      // Email and authentication tokens
      'emailLogs',
      'mailTokens',
      
      // Sales rep commission data
      'repPayments',
      'repCommissions',
      
      // Credit system (transactional)
      'creditTransactions',
      'customerCredits',
      
      // AI recommendations (user-specific)
      'aiRecommendations',
      
      // Batch upload history
      'batchUploadErrors',
      'batchUploads',
      
      // Supplier order tracking
      'orderItemSupplierStatus',
    ];
    
    // Clear each table
    for (const table of tablesToClear) {
      try {
        const result = await client.query(`DELETE FROM "${table}"`);
        console.log(`✅ Cleared ${table}: ${result.rowCount} rows deleted`);
      } catch (error) {
        console.log(`⚠️  Table ${table} might not exist or is empty: ${error.message}`);
      }
    }
    
    // Reset sequence counters for tables that will have new data
    const sequencesToReset = [
      'orders_id_seq',
      'orderItems_id_seq', 
      'orderStatusHistory_id_seq',
      'cart_items_id_seq',
      'emailLogs_id_seq',
      'mailTokens_id_seq',
      'repCommissions_id_seq',
      'repPayments_id_seq',
      'aiRecommendations_id_seq',
      'batchUploads_id_seq',
      'batchUploadErrors_id_seq',
    ];
    
    for (const sequence of sequencesToReset) {
      try {
        await client.query(`ALTER SEQUENCE "${sequence}" RESTART WITH 1`);
        console.log(`🔄 Reset sequence: ${sequence}`);
      } catch (error) {
        console.log(`⚠️  Sequence ${sequence} might not exist: ${error.message}`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n🎉 Transactional data cleanup completed successfully!');
    console.log('\n📊 Data preserved:');
    console.log('   ✓ Users and authentication');
    console.log('   ✓ Products and inventory');
    console.log('   ✓ Categories and attributes');
    console.log('   ✓ Suppliers and catalogs');
    console.log('   ✓ Sales representatives');
    console.log('   ✓ System settings and configuration');
    console.log('   ✓ Product images and media');
    console.log('   ✓ PUDO lockers');
    console.log('   ✓ Pricing and promotions');
    
    console.log('\n🗑️  Data cleared:');
    console.log('   ✗ All customer orders and order history');
    console.log('   ✗ Shopping cart contents');
    console.log('   ✗ Email notification logs');
    console.log('   ✗ Password reset and verification tokens');
    console.log('   ✗ Sales commission records');
    console.log('   ✗ User favorites and interactions');
    console.log('   ✗ Abandoned cart tracking');
    console.log('   ✗ Batch upload history');
    console.log('   ✗ Customer credit balances');
    
    console.log('\n✨ System is now ready for fresh testing with clean transactional data!');
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Error during cleanup, transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the cleanup
clearTransactionalData().catch(console.error);