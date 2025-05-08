/**
 * Timezone Migration Script for TeeMeYou
 * 
 * This script updates all timestamp columns in the database to use the SAST timezone.
 * It should be run once during the migration to standardized timestamps.
 */

import { pool, setSessionTimezone } from '../server/db';
import { SAST_TIMEZONE } from '../shared/date-utils';

// List of all tables and their timestamp columns
const tablesWithTimestamps = [
  { table: 'users', columns: ['created_at', 'updated_at', 'last_login'] },
  { table: 'products', columns: ['created_at', 'flash_deal_end'] },
  { table: 'categories', columns: [] }, // No timestamp columns
  { table: 'catalogs', columns: ['created_at', 'updated_at', 'start_date', 'end_date'] },
  { table: 'suppliers', columns: ['created_at', 'updated_at'] },
  { table: 'orders', columns: ['created_at'] },
  { table: 'order_items', columns: [] }, // No timestamp columns
  { table: 'cart_items', columns: ['created_at'] },
  { table: 'attributes', columns: ['created_at', 'updated_at'] },
  { table: 'attribute_options', columns: ['created_at', 'updated_at'] },
  { table: 'catalog_attributes', columns: ['created_at', 'updated_at'] },
  { table: 'catalog_attribute_options', columns: ['created_at', 'updated_at'] },
  { table: 'category_attributes', columns: ['created_at', 'updated_at'] },
  { table: 'category_attribute_options', columns: ['created_at', 'updated_at'] },
  { table: 'product_attributes', columns: ['created_at', 'updated_at'] },
  { table: 'product_attribute_options', columns: ['created_at', 'updated_at'] },
  { table: 'product_attribute_values', columns: ['created_at', 'updated_at', 'date_value'] },
  { table: 'product_images', columns: ['created_at'] },
  { table: 'pricing', columns: ['created_at', 'updated_at'] },
  { table: 'attribute_discount_rules', columns: [
    'created_at', 'updated_at', 'start_date', 'end_date'
  ]},
  { table: 'ai_recommendations', columns: ['created_at'] },
  { table: 'ai_settings', columns: ['created_at', 'updated_at'] },
  { table: 'session', columns: ['expire'] }
];

async function updateTimezoneForTable(
  tableName: string, 
  columnNames: string[]
): Promise<void> {
  // Skip if no timestamp columns
  if (columnNames.length === 0) {
    console.log(`Skipping table '${tableName}' - no timestamp columns`);
    return;
  }

  console.log(`Processing table: ${tableName}`);
  
  for (const columnName of columnNames) {
    try {
      // Create a copy of the column with timezone information
      await pool.query(`
        ALTER TABLE ${tableName} 
        ADD COLUMN ${columnName}_with_tz timestamptz
      `);
      
      // Convert the existing timestamp to timestamptz with SAST
      await pool.query(`
        UPDATE ${tableName}
        SET ${columnName}_with_tz = ${columnName} AT TIME ZONE '${SAST_TIMEZONE}'
        WHERE ${columnName} IS NOT NULL
      `);
      
      // Rename columns to switch to the new format
      await pool.query(`
        ALTER TABLE ${tableName}
        DROP COLUMN ${columnName}
      `);
      
      await pool.query(`
        ALTER TABLE ${tableName}
        RENAME COLUMN ${columnName}_with_tz TO ${columnName}
      `);
      
      console.log(`  - Converted column: ${columnName}`);
    } catch (error) {
      console.error(`Failed to convert column ${tableName}.${columnName}:`, error);
    }
  }
}

async function migrateAllTimezones(): Promise<void> {
  try {
    // Set session timezone to SAST to ensure consistent behavior
    await setSessionTimezone();
    
    console.log(`Starting timestamp migration to SAST (${SAST_TIMEZONE}) timezone...`);
    
    // Create a database backup (ideally implemented separately)
    console.log('WARNING: Ensure you have created a database backup before proceeding!');
    
    // Process each table
    for (const table of tablesWithTimestamps) {
      await updateTimezoneForTable(table.table, table.columns);
    }
    
    console.log('Timezone migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the migration (when executing this file directly as an ES module)
migrateAllTimezones().catch(console.error);

export { migrateAllTimezones };