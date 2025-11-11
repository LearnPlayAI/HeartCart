import postgres from 'postgres';
import { readFileSync } from 'fs';

const sql = postgres({
  host: process.env.PROD_DB_PGHOST!,
  port: parseInt(process.env.PROD_DB_PGPORT || '5432'),
  database: process.env.PROD_DB_PGDATABASE!,
  username: process.env.PROD_DB_PGUSER!,
  password: process.env.PROD_DB_PGPASS!,
  ssl: 'require'
});

async function runMigration() {
  try {
    console.log('=== RUNNING PRODUCTION SCHEMA MIGRATION ===\n');
    
    // Read migration SQL
    const migrationSQL = readFileSync('migrate-production-schema.sql', 'utf8');
    
    console.log('Executing migration...');
    await sql.unsafe(migrationSQL);
    
    console.log('\n✅ MIGRATION COMPLETE!\n');
    
    // Verify the schema
    console.log('Verifying new schema...');
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'shippingMethods'
      AND column_name IN ('code', 'baseCost', 'customerPrice', 'logisticsCompanyId', 'estimatedDeliveryDays')
      ORDER BY column_name
    `;
    console.log('New columns:');
    console.log(columns);
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await sql.end();
  }
}

runMigration();
