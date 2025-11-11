/**
 * Production Migration Script: Backfill Legacy Products with Unknown Supplier
 * 
 * This script safely:
 * 1. Creates an "Unknown Supplier" if it doesn't exist
 * 2. Updates all products with null supplierId to reference it
 * 3. Applies the NOT NULL constraint to products.supplierId
 * 
 * Usage:
 *   tsx run-supplier-migration.ts
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function runMigration() {
  console.log('🚀 Starting supplier migration...\n');

  try {
    // Start transaction
    console.log('📝 Starting transaction...');
    await sql`BEGIN`;

    // Step 1: Create Unknown Supplier if it doesn't exist
    console.log('👤 Creating Unknown Supplier (if needed)...');
    const insertResult = await sql`
      INSERT INTO suppliers (
        name,
        email,
        phone,
        address,
        is_active,
        created_at,
        updated_at
      )
      SELECT
        'Unknown Supplier',
        'legacy@heartcart.shop',
        '0000000000',
        'Legacy Products - No Supplier Information',
        true,
        NOW()::text,
        NOW()::text
      WHERE NOT EXISTS (
        SELECT 1 FROM suppliers WHERE name = 'Unknown Supplier'
      )
      RETURNING id
    `;

    // Step 2: Get Unknown Supplier ID
    const supplierResult = await sql`
      SELECT id FROM suppliers WHERE name = 'Unknown Supplier' LIMIT 1
    `;
    const unknownSupplierId = supplierResult[0].id;
    console.log(`   ✓ Unknown Supplier ID: ${unknownSupplierId}`);

    // Step 3: Check how many products need updating
    const countResult = await sql`
      SELECT COUNT(*) as count FROM products WHERE "supplierId" IS NULL
    `;
    const productsToUpdate = parseInt(countResult[0].count);
    console.log(`   ℹ Products to be updated: ${productsToUpdate}`);

    // Step 4: Update products with null supplierId
    if (productsToUpdate > 0) {
      console.log('🔄 Updating products...');
      await sql`
        UPDATE products
        SET "supplierId" = ${unknownSupplierId}
        WHERE "supplierId" IS NULL
      `;
      console.log(`   ✓ Updated ${productsToUpdate} products`);
    } else {
      console.log('   ✓ No products need updating');
    }

    // Step 5: Verify no null values remain
    console.log('🔍 Verifying data integrity...');
    const verifyResult = await sql`
      SELECT COUNT(*) as count FROM products WHERE "supplierId" IS NULL
    `;
    const remainingNulls = parseInt(verifyResult[0].count);

    if (remainingNulls > 0) {
      throw new Error(`Still have ${remainingNulls} products with null supplierId!`);
    }
    console.log('   ✓ Verification passed: No null suppliers');

    // Step 6: Apply NOT NULL constraint
    console.log('🔒 Applying NOT NULL constraint...');
    await sql`ALTER TABLE products ALTER COLUMN "supplierId" SET NOT NULL`;
    console.log('   ✓ Constraint applied successfully');

    // Commit transaction
    await sql`COMMIT`;
    console.log('\n✅ Migration completed successfully!\n');

    // Final verification
    console.log('📊 Final Statistics:');
    const stats = await sql`
      SELECT 
        COUNT(*) as total_products,
        COUNT("supplierId") as products_with_supplier,
        COUNT(*) FILTER (WHERE "supplierId" = ${unknownSupplierId}) as legacy_products
      FROM products
    `;
    
    console.log(`   • Total products: ${stats[0].total_products}`);
    console.log(`   • Products with supplier: ${stats[0].products_with_supplier}`);
    console.log(`   • Legacy products (Unknown Supplier): ${stats[0].legacy_products}`);

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error);
    
    try {
      await sql`ROLLBACK`;
      console.log('🔄 Transaction rolled back successfully');
    } catch (rollbackError) {
      console.error('Failed to rollback:', rollbackError);
    }
    
    process.exit(1);
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n🎉 All done! Your deployment should now work.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
