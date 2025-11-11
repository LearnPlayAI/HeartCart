import postgres from 'postgres';

const sql = postgres({
  host: process.env.PROD_DB_PGHOST!,
  port: parseInt(process.env.PROD_DB_PGPORT || '5432'),
  database: process.env.PROD_DB_PGDATABASE!,
  username: process.env.PROD_DB_PGUSER!,
  password: process.env.PROD_DB_PGPASS!,
  ssl: 'require'
});

async function checkSchema() {
  try {
    console.log('=== CHECKING SUPPLIER SHIPPING SCHEMA ===\n');
    
    // Check supplierShippingMethods table schema
    console.log('1. supplierShippingMethods columns:');
    const ssmColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'supplierShippingMethods'
      ORDER BY ordinal_position
    `;
    console.log(ssmColumns);
    console.log('');
    
    // Check what data exists
    console.log('2. Existing supplierShippingMethods data:');
    const ssmData = await sql`
      SELECT *
      FROM "supplierShippingMethods"
      LIMIT 10
    `;
    console.log(ssmData);
    console.log('');
    
    // Check if any data exists for our suppliers
    console.log('3. Count by supplier:');
    const count = await sql`
      SELECT supplier_id, COUNT(*) as count
      FROM "supplierShippingMethods"
      GROUP BY supplier_id
    `;
    console.log(count);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

checkSchema();
