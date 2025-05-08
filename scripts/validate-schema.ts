/**
 * Schema Validation Tool for TeeMeYou
 * 
 * This script performs comprehensive validation of the database schema
 * to ensure it follows best practices and standards.
 * 
 * It checks:
 * 1. Table and column naming conventions
 * 2. Presence of proper timestamps
 * 3. Use of correct timezone settings
 * 4. Foreign key relationships
 * 5. Index configurations
 * 6. Common schema errors
 * 
 * Usage: npm run validate:schema
 */

import * as schema from "../shared/schema";
import { SQL, eq } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { tableCreator } from "drizzle-orm/pg-core";
import chalk from "chalk";
import dotenv from "dotenv";

dotenv.config();

// Configuration
const TIMESTAMP_COLUMNS = ['createdAt', 'updatedAt', 'lastLogin', 'startDate', 'endDate', 'flashDealEnd', 'dateValue'];
const REQUIRED_INDEXES = [
  { table: 'products', column: 'slug' },
  { table: 'categories', column: 'slug' },
  { table: 'users', column: 'email' },
  { table: 'users', column: 'username' },
  { table: 'products', column: 'categoryId' },
  { table: 'products', column: 'catalogId' },
];

// Connect to the database
function createDbConnection() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return drizzle({ client: pool });
}

// Helper function to check if a table exists
async function tableExists(db: any, tableName: string): Promise<boolean> {
  const result = await db.execute(SQL`
    SELECT EXISTS(
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_name = ${tableName}
    );
  `);
  return result[0]?.exists || false;
}

// Check for proper timestamp configuration
async function validateTimestamps(db: any) {
  console.log(chalk.blue('\nChecking timestamp configuration...'));
  const issues: string[] = [];
  
  // Get all tables and their timestamp columns
  const result = await db.execute(SQL`
    SELECT 
      t.table_name, 
      c.column_name, 
      c.data_type, 
      c.is_nullable
    FROM 
      information_schema.tables t
    JOIN 
      information_schema.columns c ON t.table_name = c.table_name
    WHERE 
      t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name IN ('created_at', 'updated_at', 'last_login', 'start_date', 'end_date', 'flash_deal_end', 'date_value');
  `);
  
  for (const row of result) {
    const { table_name, column_name, data_type, is_nullable } = row;
    
    // Check for proper timestamp with timezone
    if (data_type !== 'timestamp with time zone') {
      issues.push(`Table '${table_name}' has column '${column_name}' with incorrect data type '${data_type}'. Should be 'timestamp with time zone'.`);
    }
    
    // Check if createdAt and updatedAt are NOT NULL
    if (['created_at', 'updated_at'].includes(column_name) && is_nullable === 'YES') {
      issues.push(`Table '${table_name}' has nullable '${column_name}' column. This should be NOT NULL.`);
    }
  }
  
  if (issues.length === 0) {
    console.log(chalk.green('✓ All timestamp columns use correct timezone settings.'));
  } else {
    console.log(chalk.red(`✗ Found ${issues.length} issues with timestamp columns:`));
    issues.forEach(issue => console.log(chalk.yellow(`  - ${issue}`)));
  }
  
  return issues;
}

// Check table and column naming conventions
async function validateNamingConventions(db: any) {
  console.log(chalk.blue('\nChecking naming conventions...'));
  const issues: string[] = [];
  
  // Get all tables and columns
  const result = await db.execute(SQL`
    SELECT 
      t.table_name, 
      c.column_name
    FROM 
      information_schema.tables t
    JOIN 
      information_schema.columns c ON t.table_name = c.table_name
    WHERE 
      t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE';
  `);
  
  // Check table names (should be snake_case and plural)
  const tableNames = [...new Set(result.map(r => r.table_name))];
  for (const tableName of tableNames) {
    // Table should be snake_case and plural
    if (!tableName.match(/^[a-z_]+$/)) {
      issues.push(`Table '${tableName}' doesn't follow snake_case naming convention.`);
    }
  }
  
  // Check column names (should be snake_case)
  for (const row of result) {
    const { table_name, column_name } = row;
    
    if (!column_name.match(/^[a-z_]+$/)) {
      issues.push(`Column '${column_name}' in table '${table_name}' doesn't follow snake_case naming convention.`);
    }
  }
  
  if (issues.length === 0) {
    console.log(chalk.green('✓ All tables and columns follow naming conventions.'));
  } else {
    console.log(chalk.red(`✗ Found ${issues.length} naming convention issues:`));
    issues.forEach(issue => console.log(chalk.yellow(`  - ${issue}`)));
  }
  
  return issues;
}

// Check foreign key relationships
async function validateForeignKeys(db: any) {
  console.log(chalk.blue('\nChecking foreign key relationships...'));
  const issues: string[] = [];
  
  // Get all foreign keys
  const result = await db.execute(SQL`
    SELECT
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY';
  `);
  
  // Check if the referenced tables and columns exist
  for (const row of result) {
    const { table_name, column_name, foreign_table_name, foreign_column_name } = row;
    
    // Check if the referenced table exists
    const tableExists = await db.execute(SQL`
      SELECT EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = ${foreign_table_name}
      );
    `);
    
    if (!tableExists[0]?.exists) {
      issues.push(`Foreign key '${column_name}' in table '${table_name}' references non-existent table '${foreign_table_name}'.`);
      continue;
    }
    
    // Check if the referenced column exists
    const columnExists = await db.execute(SQL`
      SELECT EXISTS(
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = ${foreign_table_name}
          AND column_name = ${foreign_column_name}
      );
    `);
    
    if (!columnExists[0]?.exists) {
      issues.push(`Foreign key '${column_name}' in table '${table_name}' references non-existent column '${foreign_column_name}' in table '${foreign_table_name}'.`);
    }
  }
  
  if (issues.length === 0) {
    console.log(chalk.green('✓ All foreign key relationships are valid.'));
  } else {
    console.log(chalk.red(`✗ Found ${issues.length} issues with foreign key relationships:`));
    issues.forEach(issue => console.log(chalk.yellow(`  - ${issue}`)));
  }
  
  return issues;
}

// Check index configuration
async function validateIndexes(db: any) {
  console.log(chalk.blue('\nChecking index configuration...'));
  const issues: string[] = [];
  
  // Check if required indexes exist
  for (const { table, column } of REQUIRED_INDEXES) {
    const indexExists = await db.execute(SQL`
      SELECT EXISTS(
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = ${table}
          AND indexdef LIKE ${'%' + column + '%'}
      );
    `);
    
    if (!indexExists[0]?.exists) {
      issues.push(`Missing index on '${table}.${column}'.`);
    }
  }
  
  if (issues.length === 0) {
    console.log(chalk.green('✓ All required indexes are present.'));
  } else {
    console.log(chalk.red(`✗ Found ${issues.length} missing indexes:`));
    issues.forEach(issue => console.log(chalk.yellow(`  - ${issue}`)));
  }
  
  return issues;
}

// Validate the database schema against Drizzle schema
async function validateSchemaConsistency(db: any) {
  console.log(chalk.blue('\nChecking schema consistency with Drizzle definitions...'));
  const issues: string[] = [];
  
  // Get all tables defined in the schema
  const schemaTables = Object.entries(schema)
    .filter(([_, value]) => typeof value === 'object' && value !== null && 'name' in value)
    .map(([_, value]) => (value as any).name);
  
  // Get all tables in the database
  const dbTables = await db.execute(SQL`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE';
  `);
  
  const dbTableNames = dbTables.map(row => row.table_name);
  
  // Check for tables in schema but not in DB
  for (const table of schemaTables) {
    if (!dbTableNames.includes(table)) {
      issues.push(`Table '${table}' is defined in schema but doesn't exist in the database.`);
    }
  }
  
  // Check for tables in DB but not in schema
  for (const table of dbTableNames) {
    if (!schemaTables.includes(table) && !['drizzle', 'schema_migrations', 'drizzle_migrations', 'session'].includes(table)) {
      issues.push(`Table '${table}' exists in the database but is not defined in the schema.`);
    }
  }
  
  if (issues.length === 0) {
    console.log(chalk.green('✓ Schema definitions match database structure.'));
  } else {
    console.log(chalk.red(`✗ Found ${issues.length} schema consistency issues:`));
    issues.forEach(issue => console.log(chalk.yellow(`  - ${issue}`)));
  }
  
  return issues;
}

// Main execution function
async function main() {
  console.log(chalk.blue('TeeMeYou Schema Validation Tool'));
  console.log(chalk.blue('=============================='));
  
  try {
    const db = createDbConnection();
    
    // Run all validation checks
    const timestampIssues = await validateTimestamps(db);
    const namingIssues = await validateNamingConventions(db);
    const foreignKeyIssues = await validateForeignKeys(db);
    const indexIssues = await validateIndexes(db);
    const schemaIssues = await validateSchemaConsistency(db);
    
    // Calculate total issues
    const totalIssues = [
      ...timestampIssues,
      ...namingIssues,
      ...foreignKeyIssues,
      ...indexIssues,
      ...schemaIssues
    ];
    
    // Print summary
    console.log('\n' + chalk.blue('Summary:'));
    console.log(chalk.blue('-------'));
    console.log(`Timestamp Issues: ${timestampIssues.length}`);
    console.log(`Naming Convention Issues: ${namingIssues.length}`);
    console.log(`Foreign Key Issues: ${foreignKeyIssues.length}`);
    console.log(`Index Issues: ${indexIssues.length}`);
    console.log(`Schema Consistency Issues: ${schemaIssues.length}`);
    console.log(chalk.blue(`Total Issues: ${totalIssues.length}`));
    
    if (totalIssues.length === 0) {
      console.log('\n' + chalk.green('✓ Database schema validation passed successfully!'));
    } else {
      console.log('\n' + chalk.red(`✗ Database schema validation found ${totalIssues.length} issues.`));
      console.log(chalk.yellow('Please fix these issues to ensure database integrity.'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Error validating schema:'), error);
    process.exit(1);
  }
}

// Execute the script
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});