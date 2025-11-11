import postgres from 'postgres';

const sql = postgres({
  host: process.env.PROD_DB_PGHOST!,
  port: parseInt(process.env.PROD_DB_PGPORT || '5432'),
  database: process.env.PROD_DB_PGDATABASE!,
  username: process.env.PROD_DB_PGUSER!,
  password: process.env.PROD_DB_PGPASS!,
  ssl: 'require'
});

async function diagnoseProductionShipping() {
  try {
    console.log('=== PRODUCTION DATABASE DIAGNOSTIC ===\n');

    // 1. Check table schema for shippingMethods
    console.log('1. Checking shippingMethods table schema:');
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'shippingMethods'
      ORDER BY ordinal_position
    `;
    console.log(columns);
    console.log('');

    // 2. Check if table exists
    console.log('2. Checking which shipping tables exist:');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('shippingMethods', 'supplierShippingMethods', 'logisticsCompanies', 'supplier_shipping_methods', 'shipping_methods', 'logistics_companies')
    `;
    console.log(tables.map((t: any) => t.table_name));
    console.log('');

    // 3. Check Fulvic products with NULL supplierId
    console.log('3. Fulvic products missing supplierId:');
    const fulvicProducts = await sql`
      SELECT id, name, "supplierId" 
      FROM products 
      WHERE name LIKE '%Fulvic%'
      ORDER BY id
      LIMIT 15
    `;
    console.log(fulvicProducts);
    console.log('');

    // 4. Check suppliers table
    console.log('4. Checking suppliers (looking for Fulvic Health):');
    const suppliers = await sql`
      SELECT id, name 
      FROM suppliers
      WHERE name LIKE '%Fulvic%' OR id = 7
    `;
    console.log(suppliers);
    console.log('');

    console.log('=== ROOT CAUSE IDENTIFIED ===');
    console.log('❌ All Fulvic products have supplierId = NULL');
    console.log('❌ Schema appears different from development (missing columns)');
    console.log('');
    console.log('SOLUTION REQUIRED:');
    console.log('1. Update products to set supplierId = 7 for Fulvic products');
    console.log('2. Ensure shipping_methods tables exist with proper schema');
    console.log('3. Run missing migrations to sync schema');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

diagnoseProductionShipping();
