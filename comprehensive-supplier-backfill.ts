import postgres from 'postgres';

const sql = postgres({
  host: process.env.PROD_DB_PGHOST!,
  port: parseInt(process.env.PROD_DB_PGPORT || '5432'),
  database: process.env.PROD_DB_PGDATABASE!,
  username: process.env.PROD_DB_PGUSER!,
  password: process.env.PROD_DB_PGPASS!,
  ssl: 'require'
});

async function comprehensiveSupplierBackfill() {
  try {
    console.log('=== COMPREHENSIVE SUPPLIER ID BACKFILL ===\n');
    
    // Map legacy supplier values to new supplierId values
    const legacyMapping = {
      '1': 1,  // blhomeware
      '2': 2,  // DMC Wholesale
      '3': 7,  // Fulvic Health (if they used '3' in legacy)
    };
    
    let totalUpdated = 0;
    
    // Update products based on legacy supplier column
    console.log('Step 1: Mapping products based on legacy supplier column...');
    for (const [legacyValue, newSupplierId] of Object.entries(legacyMapping)) {
      const result = await sql`
        UPDATE products
        SET "supplierId" = ${newSupplierId}
        WHERE supplier = ${legacyValue}
        AND "supplierId" IS NULL
        RETURNING id, name
      `;
      
      if (result.length > 0) {
        console.log(`✓ Updated ${result.length} products from legacy supplier='${legacyValue}' to supplierId=${newSupplierId}`);
        totalUpdated += result.length;
      }
    }
    console.log('');
    
    // Check remaining products
    console.log('Step 2: Checking remaining products...');
    const remaining = await sql`
      SELECT COUNT(*) as count
      FROM products
      WHERE "supplierId" IS NULL
    `;
    console.log(`Products still missing supplierId: ${remaining[0].count}\n`);
    
    // Show sample of remaining products
    if (parseInt(remaining[0].count) > 0) {
      const samples = await sql`
        SELECT id, name, supplier
        FROM products
        WHERE "supplierId" IS NULL
        ORDER BY id
        LIMIT 10
      `;
      console.log('Sample of remaining products:');
      samples.forEach((p: any) => console.log(`  - ID ${p.id}: supplier='${p.supplier}'`));
      console.log('');
    }
    
    // Final verification
    console.log('Step 3: Final supplier distribution:');
    const distribution = await sql`
      SELECT 
        COALESCE(s.name, 'Unassigned') as supplier_name,
        COALESCE(s.id, 0) as supplier_id,
        COUNT(p.id) as product_count
      FROM products p
      LEFT JOIN suppliers s ON p."supplierId" = s.id
      GROUP BY s.id, s.name
      ORDER BY s.id NULLS LAST
    `;
    console.log(distribution);
    
    console.log(`\n✅ BACKFILL COMPLETE - Updated ${totalUpdated} products`);
    
    // Check if supplier shipping methods are configured
    console.log('\nStep 4: Checking supplier shipping method configuration...');
    const shippingConfig = await sql`
      SELECT 
        ssm."supplierId",
        s.name as supplier_name,
        COUNT(ssm.id) as method_count
      FROM "supplierShippingMethods" ssm
      JOIN suppliers s ON s.id = ssm."supplierId"
      WHERE ssm."isEnabled" = true
      GROUP BY ssm."supplierId", s.name
      ORDER BY ssm."supplierId"
    `;
    
    if (shippingConfig.length > 0) {
      console.log('Suppliers with configured shipping methods:');
      console.log(shippingConfig);
    } else {
      console.log('⚠️  No suppliers have shipping methods configured!');
    }
    
  } catch (error) {
    console.error('Backfill error:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

comprehensiveSupplierBackfill();
