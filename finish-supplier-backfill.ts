import postgres from 'postgres';

const sql = postgres({
  host: process.env.PROD_DB_PGHOST!,
  port: parseInt(process.env.PROD_DB_PGPORT || '5432'),
  database: process.env.PROD_DB_PGDATABASE!,
  username: process.env.PROD_DB_PGUSER!,
  password: process.env.PROD_DB_PGPASS!,
  ssl: 'require'
});

async function finishBackfill() {
  try {
    console.log('=== FINISHING SUPPLIER BACKFILL ===\n');
    
    // Fix remaining products with legacy supplier='7' -> supplierId=7
    console.log('Updating products with legacy supplier=\'7\' to supplierId=7...');
    const fulvicFix = await sql`
      UPDATE products
      SET "supplierId" = 7
      WHERE supplier = '7'
      AND "supplierId" IS NULL
      RETURNING id, name
    `;
    console.log(`✓ Updated ${fulvicFix.length} Fulvic products\n`);
    
    // Check what's left
    const remaining = await sql`
      SELECT id, name, supplier
      FROM products
      WHERE "supplierId" IS NULL
      ORDER BY id
    `;
    
    if (remaining.length > 0) {
      console.log(`⚠️  ${remaining.length} products still need manual assignment:`);
      remaining.slice(0, 10).forEach((p: any) => 
        console.log(`  - ID ${p.id}: "${p.name}" (supplier: ${p.supplier})`)
      );
    } else {
      console.log('✅ All products have supplierId assigned!');
    }
    
    console.log('\nFinal distribution:');
    const dist = await sql`
      SELECT 
        COALESCE(s.name, 'Unassigned') as supplier_name,
        COUNT(p.id) as count
      FROM products p
      LEFT JOIN suppliers s ON p."supplierId" = s.id
      GROUP BY s.name
      ORDER BY COUNT(p.id) DESC
    `;
    console.log(dist);
    
    // Check supplier shipping configuration
    console.log('\nChecking supplier shipping methods...');
    const shippingMethods = await sql`
      SELECT 
        ssm."supplierId",
        s.name as supplier_name,
        ssm."shippingMethodId",
        sm.name as method_name,
        ssm."isEnabled"
      FROM "supplierShippingMethods" ssm
      JOIN suppliers s ON s.id = ssm."supplierId"
      JOIN "shippingMethods" sm ON sm.id = ssm."shippingMethodId"
      ORDER BY ssm."supplierId"
    `;
    
    if (shippingMethods.length > 0) {
      console.log('✓ Configured shipping methods:');
      console.log(shippingMethods);
    } else {
      console.log('⚠️  No supplier shipping methods configured!');
      console.log('   Need to insert records into supplierShippingMethods table');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

finishBackfill();
