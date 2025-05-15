/**
 * Schema Migration Executor
 * 
 * This script runs the migration SQL file to align the database with the TypeScript schema.
 * Run this script to apply the schema fixes defined in migration-schema-sync.sql.
 * 
 * Usage:
 * npx tsx scripts/run-schema-migration.ts
 */

import { db } from '../server/db';
import fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('Starting schema migration...');
  
  try {
    const migrationPath = path.join(process.cwd(), 'migration-schema-sync.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }
    
    console.log('Reading migration file...');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration...');
    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Migration executed successfully');
    
    // Verify the migration worked by checking if the columns were added
    const categoryColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' 
      AND column_name IN ('created_at', 'updated_at')
    `);
    
    const productDraftsColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'product_drafts' 
      AND column_name IN ('selected_attributes', 'ai_suggestions', 'discount_data')
    `);
    
    console.log(`\nVerification results:`);
    console.log(`- Categories timestamp fields: ${categoryColumns.rows.length} of 2 found`);
    console.log(`- Product drafts JSON fields: ${productDraftsColumns.rows.length} of 3 found`);
    
    if (categoryColumns.rows.length === 2 && productDraftsColumns.rows.length === 3) {
      console.log('\n✅ All schema changes were applied successfully!');
    } else {
      console.log('\n⚠️ Some schema changes may not have been applied correctly.');
      console.log('   Please check the database structure and try again if needed.');
    }
  } catch (error) {
    console.error('Error executing migration:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });