import postgres from 'postgres';

// Connect to production database using PROD_ secrets
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

    // 1. Check Fulvic Health products
    console.log('1. Checking Fulvic Health products:');
    const products = await sql`
      SELECT id, name, "supplierId" 
      FROM products 
      WHERE name LIKE '%Fulvic%' 
      LIMIT 10
    `;
    console.log(products);
    console.log('');

    // 2. Check all shipping methods
    console.log('2. Checking shipping methods:');
    const shippingMethods = await sql`
      SELECT id, name, code, "customerPrice", "isActive", "logisticsCompanyId"
      FROM "shippingMethods"
      ORDER BY id
    `;
    console.log(shippingMethods);
    console.log('');

    // 3. Check supplier shipping associations for Fulvic Health (supplierId=7)
    console.log('3. Checking supplier-shipping associations for supplierId=7:');
    const supplierShipping = await sql`
      SELECT ssm.id, ssm."supplierId", ssm."shippingMethodId", ssm."isEnabled",
             sm.name as method_name, sm."isActive" as method_active
      FROM "supplierShippingMethods" ssm
      LEFT JOIN "shippingMethods" sm ON ssm."shippingMethodId" = sm.id
      WHERE ssm."supplierId" = 7
    `;
    console.log(supplierShipping);
    console.log('');

    // 4. Check logistics companies
    console.log('4. Checking logistics companies:');
    const companies = await sql`
      SELECT id, name, code, "isActive"
      FROM "logisticsCompanies"
      ORDER BY id
    `;
    console.log(companies);
    console.log('');

    // 5. Check if any products are missing supplierId
    console.log('5. Checking products with NULL supplierId:');
    const missingSupplier = await sql`
      SELECT COUNT(*) as count
      FROM products
      WHERE "supplierId" IS NULL
    `;
    console.log(missingSupplier);
    console.log('');

    // Diagnosis
    console.log('=== DIAGNOSIS ===');
    if (products.length === 0) {
      console.log('❌ No Fulvic products found in production');
    } else if (products.some((p: any) => !p.supplierId)) {
      console.log('❌ Fulvic products are missing supplierId');
    } else {
      console.log('✓ Fulvic products have supplierId set');
    }

    if (supplierShipping.length === 0) {
      console.log('❌ No shipping methods configured for supplierId=7');
      console.log('   → This is the root cause! Need to insert supplierShippingMethods records');
    } else if (supplierShipping.some((s: any) => !s.isEnabled)) {
      console.log('⚠️  Shipping methods exist but are disabled');
    } else if (supplierShipping.some((s: any) => !s.method_active)) {
      console.log('⚠️  Shipping methods exist but parent method is inactive');
    } else {
      console.log('✓ Shipping methods properly configured for supplierId=7');
    }

  } catch (error) {
    console.error('Error diagnosing production database:', error);
  } finally {
    await sql.end();
  }
}

diagnoseProductionShipping();
