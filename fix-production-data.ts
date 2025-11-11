import postgres from 'postgres';

const sql = postgres({
  host: process.env.PROD_DB_PGHOST!,
  port: parseInt(process.env.PROD_DB_PGPORT || '5432'),
  database: process.env.PROD_DB_PGDATABASE!,
  username: process.env.PROD_DB_PGUSER!,
  password: process.env.PROD_DB_PGPASS!,
  ssl: 'require'
});

async function fixProductionData() {
  try {
    console.log('=== FIXING PRODUCTION DATA ===\n');

    // Fix 1: Update Fulvic products to have supplierId = 7
    console.log('1. Updating Fulvic products to set supplierId = 7...');
    const result = await sql`
      UPDATE products
      SET "supplierId" = 7
      WHERE name LIKE '%Fulvic%'
      AND "supplierId" IS NULL
      RETURNING id, name
    `;
    console.log(`✓ Updated ${result.length} Fulvic products`);
    result.forEach((p: any) => console.log(`  - ${p.id}: ${p.name}`));
    console.log('');

    // Verify the fix
    console.log('2. Verifying Fulvic products now have supplierId...');
    const verify = await sql`
      SELECT id, name, "supplierId"
      FROM products
      WHERE name LIKE '%Fulvic%'
      ORDER BY id
      LIMIT 5
    `;
    console.log(verify);
    console.log('');

    console.log('✅ DATA FIX COMPLETE!');
    console.log('');
    console.log('⚠️  SCHEMA MIGRATION STILL NEEDED:');
    console.log('The production shippingMethods table uses old column names.');
    console.log('You need to run migrations to update:');
    console.log('  - basePrice → baseCost');
    console.log('  - companyId → logisticsCompanyId');
    console.log('  - estimatedDays → estimatedDeliveryDays');
    console.log('  - Add "code" column');
    console.log('');
    console.log('Run: npm run drizzle-kit push (or apply pending migrations)');

  } catch (error) {
    console.error('Error fixing production data:', error);
  } finally {
    await sql.end();
  }
}

fixProductionData();
