/**
 * Schema Verification Utility
 * 
 * This script verifies that the database schema matches the TypeScript schema definition.
 * It checks for missing columns in the database that are defined in the schema.ts file.
 * 
 * Usage:
 * npm run verify-schema
 */

import { db } from '../server/db';
import fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';

async function verifySchema() {
  console.log('Starting schema verification...');
  
  try {
    // Check if categories table has required timestamp fields
    const categoryColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' 
      AND column_name IN ('created_at', 'updated_at')
    `);
    
    const categoryColumnsFound = categoryColumns.rows.length;
    if (categoryColumnsFound < 2) {
      console.error('❌ Categories table is missing timestamp fields (created_at, updated_at)');
      console.log(`   Found ${categoryColumnsFound} of 2 required timestamp fields`);
    } else {
      console.log('✅ Categories table timestamp fields verified (created_at, updated_at)');
    }
    
    // Check if product_drafts table has required JSON fields
    const productDraftsColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'product_drafts' 
      AND column_name IN ('selected_attributes', 'ai_suggestions', 'discount_data')
    `);
    
    const productDraftsColumnsFound = productDraftsColumns.rows.length;
    if (productDraftsColumnsFound < 3) {
      console.error('❌ Product drafts table is missing JSON fields (selected_attributes, ai_suggestions, discount_data)');
      console.log(`   Found ${productDraftsColumnsFound} of 3 required JSON fields`);
    } else {
      console.log('✅ Product drafts table JSON fields verified (selected_attributes, ai_suggestions, discount_data)');
    }
    
    // Run the migration if needed
    if (categoryColumnsFound < 2 || productDraftsColumnsFound < 3) {
      console.log('Running migration to fix schema discrepancies...');
      
      const migrationPath = path.join(process.cwd(), 'migration-schema-sync.sql');
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        await db.execute(sql.raw(migrationSQL));
        console.log('✅ Migration executed successfully');
      } else {
        console.error('❌ Migration file not found: migration-schema-sync.sql');
      }
    } else {
      console.log('✅ Schema verification completed successfully. No migrations needed.');
    }
    
    // Additional information about the schema
    console.log('\nSchema information:');
    
    const tableCount = await db.execute(sql`
      SELECT count(*) FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log(`Total tables: ${tableCount.rows[0].count}`);
    
    const categoryCount = await db.execute(sql`
      SELECT count(*) FROM categories
    `);
    
    console.log(`Categories count: ${categoryCount.rows[0].count}`);
    
    const productDraftsCount = await db.execute(sql`
      SELECT count(*) FROM product_drafts
    `);
    
    console.log(`Product drafts count: ${productDraftsCount.rows[0].count}`);
  } catch (error) {
    console.error('Error verifying schema:', error);
  } finally {
    console.log('Schema verification completed');
  }
}

// Run the verification
verifySchema()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });