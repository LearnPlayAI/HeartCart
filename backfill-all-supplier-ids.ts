import postgres from 'postgres';

const sql = postgres({
  host: process.env.PROD_DB_PGHOST!,
  port: parseInt(process.env.PROD_DB_PGPORT || '5432'),
  database: process.env.PROD_DB_PGDATABASE!,
  username: process.env.PROD_DB_PGUSER!,
  password: process.env.PROD_DB_PGPASS!,
  ssl: 'require'
});

async function backfillSupplierIds() {
  try {
    console.log('=== SUPPLIER ID BACKFILL FOR ALL PRODUCTS ===\n');
    
    // Step 1: Get all suppliers
    console.log('Step 1: Fetching all suppliers...');
    const suppliers = await sql`
      SELECT id, name
      FROM suppliers
      WHERE is_active = true
      ORDER BY id
    `;
    console.log(`Found ${suppliers.length} active suppliers:`);
    suppliers.forEach((s: any) => console.log(`  - ${s.id}: ${s.name}`));
    console.log('');
    
    // Step 2: Check how many products are missing supplierId
    console.log('Step 2: Checking products missing supplierId...');
    const missingCount = await sql`
      SELECT COUNT(*) as count
      FROM products
      WHERE "supplierId" IS NULL
    `;
    console.log(`Products missing supplierId: ${missingCount[0].count}\n`);
    
    // Step 3: Map products to suppliers based on product name patterns
    const supplierMappings = [
      { supplierId: 7, pattern: '%Fulvic%', name: 'Fulvic Health' },
      { supplierId: 2, pattern: '%Solar Spin%', name: 'DMC Wholesale' },
      // Add more mappings as needed
    ];
    
    let totalUpdated = 0;
    
    for (const mapping of supplierMappings) {
      console.log(`Updating products matching "${mapping.pattern}" to supplierId=${mapping.supplierId} (${mapping.name})...`);
      
      const updated = await sql`
        UPDATE products
        SET "supplierId" = ${mapping.supplierId}
        WHERE name LIKE ${mapping.pattern}
        AND "supplierId" IS NULL
        RETURNING id, name
      `;
      
      if (updated.length > 0) {
        console.log(`✓ Updated ${updated.length} products:`);
        updated.slice(0, 5).forEach((p: any) => console.log(`  - ${p.id}: ${p.name}`));
        if (updated.length > 5) {
          console.log(`  ... and ${updated.length - 5} more`);
        }
        totalUpdated += updated.length;
      } else {
        console.log(`  No products found matching pattern`);
      }
      console.log('');
    }
    
    // Step 4: Find products still missing supplierId
    console.log('Step 4: Finding products that still need manual mapping...');
    const stillMissing = await sql`
      SELECT id, name, supplier
      FROM products
      WHERE "supplierId" IS NULL
      ORDER BY id
      LIMIT 20
    `;
    
    if (stillMissing.length > 0) {
      console.log(`\n⚠️  ${stillMissing.length} products still need supplierId assignment:`);
      stillMissing.forEach((p: any) => {
        console.log(`  - ID ${p.id}: "${p.name}" (legacy supplier: "${p.supplier || 'none'}")`);
      });
      console.log('\nThese require manual review and mapping.');
    } else {
      console.log('✓ All products have supplierId assigned!');
    }
    
    console.log(`\n✅ BACKFILL COMPLETE - Updated ${totalUpdated} products`);
    
    // Step 5: Verify supplier coverage
    console.log('\nStep 5: Supplier distribution:');
    const distribution = await sql`
      SELECT s.id, s.name, COUNT(p.id) as product_count
      FROM suppliers s
      LEFT JOIN products p ON p."supplierId" = s.id
      GROUP BY s.id, s.name
      ORDER BY s.id
    `;
    console.log(distribution);
    
  } catch (error) {
    console.error('Backfill error:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

backfillSupplierIds();
