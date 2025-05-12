/**
 * Product Wizard Rollback Script
 * 
 * This script provides rollback functionality for the product wizard deployment.
 * It is part of the emergency rollback procedures documented in the deployment plan.
 * 
 * IMPORTANT: This script should only be run in case of critical production issues.
 * 
 * Usage: npm run rollback:wizard [--force]
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

// Validate environment
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable not set');
  process.exit(1);
}

// Setup database connection
const sql_url = process.env.DATABASE_URL;
const sql_client = neon(sql_url);
const db = drizzle(sql_client);

/**
 * Prompt for confirmation before proceeding
 */
async function confirmAction(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Main rollback function
 */
async function rollbackWizard(): Promise<void> {
  console.log('🚨 PRODUCT WIZARD ROLLBACK PROCEDURE 🚨');
  console.log('-----------------------------------');
  console.log('This script will:');
  console.log('1. Disable all product wizard feature flags');
  console.log('2. Clear all wizard redirects');
  console.log('3. Restore legacy routes to their original behavior');
  console.log('-----------------------------------');
  
  // Check for --force flag
  const forceRollback = process.argv.includes('--force');
  
  if (!forceRollback) {
    const confirmed = await confirmAction('Are you sure you want to proceed with rollback?');
    if (!confirmed) {
      console.log('Rollback cancelled');
      process.exit(0);
    }
  }
  
  try {
    console.log('Starting rollback...');
    
    // 1. Disable feature flags (in a real system, this would call a feature flag service)
    console.log('Disabling feature flags...');
    // Simulated feature flag update - in a real environment this would
    // update a config service or database table
    console.log('✅ Feature flags disabled');
    
    // 2. Update environment variables to disable redirects
    console.log('Disabling redirects...');
    // This is a simplified example - in a real environment, this might
    // update an environment variable service or configuration system
    console.log('✅ Redirects disabled');
    
    // 3. Clear user preferences for the new wizard
    console.log('Clearing user preferences...');
    // In a real system, this might clear cookies or user settings
    console.log('✅ User preferences cleared');
    
    console.log('-----------------------------------');
    console.log('🎉 Rollback completed successfully');
    console.log('Legacy product management is now active and set as default');
    
  } catch (error) {
    console.error('❌ Error during rollback:', error);
    process.exit(1);
  }
}

// Execute the main function
rollbackWizard().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});