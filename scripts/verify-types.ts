/**
 * Type Verification Script for TeeMeYou
 * 
 * This script performs a static analysis of the codebase to verify type consistency
 * across the application. It checks for:
 * 
 * 1. Missing type annotations
 * 2. Inconsistent use of nullable types
 * 3. Type-unsafe operations
 * 4. Proper use of utility types and type guards
 * 
 * Usage: npm run verify:types
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..');
const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build'];
const EXTENSIONS = ['.ts', '.tsx'];

// Statistics
let filesChecked = 0;
let errorCount = 0;
let warningCount = 0;

// Patterns to check
const patterns = {
  // Missing type annotations
  missingFunctionReturnType: /function\s+\w+\s*\([^)]*\)\s*(?!:\s*\w+)/g,
  missingVariableType: /(?:const|let|var)\s+\w+\s*=\s*(?!\s*:)/g,
  
  // Nullable types issues
  unsafeNullCheck: /(\w+)\s*(?:===|!==|==|!=)\s*(?:null|undefined)/g,
  
  // Type-unsafe operations
  typeAssertion: /as\s+\w+/g,
  nonNullAssertion: /\w+!/g,
  
  // Type guards
  missingTypeGuard: /(\w+)\s*\?\s*(\w+)/g
};

/**
 * Check a file for type issues
 */
function checkFile(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(ROOT_DIR, filePath);
  let fileHasIssues = false;
  
  // Check each pattern
  for (const [name, pattern] of Object.entries(patterns)) {
    const matches = [...content.matchAll(pattern)];
    if (matches.length > 0) {
      if (!fileHasIssues) {
        console.log(chalk.underline(relativePath));
        fileHasIssues = true;
      }
      
      console.log(chalk.yellow(`  ${name}:`));
      for (const match of matches) {
        // Get the line number for this match
        const lineNumber = content.substring(0, match.index).split('\n').length;
        console.log(chalk.gray(`    Line ${lineNumber}: ${match[0].trim()}`));
        warningCount++;
      }
    }
  }
  
  // Run TypeScript compiler checks on this file
  try {
    execSync(`npx tsc --noEmit --strict ${filePath}`, { stdio: 'pipe' });
  } catch (error) {
    if (!fileHasIssues) {
      console.log(chalk.underline(relativePath));
      fileHasIssues = true;
    }
    
    console.log(chalk.red('  TypeScript compiler errors:'));
    const output = error.stderr.toString();
    const errors = output.split('\n').filter(line => line.includes('error'));
    
    for (const err of errors) {
      console.log(chalk.gray(`    ${err.trim()}`));
      errorCount++;
    }
  }
  
  filesChecked++;
}

/**
 * Recursively find all TypeScript files
 */
function findTypeScriptFiles(dir: string): string[] {
  if (IGNORED_DIRS.includes(path.basename(dir))) {
    return [];
  }
  
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...findTypeScriptFiles(fullPath));
    } else if (entry.isFile() && EXTENSIONS.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Main execution function
 */
function main(): void {
  console.log(chalk.blue('TeeMeYou Type Verification'));
  console.log(chalk.blue('--------------------------'));
  
  const files = findTypeScriptFiles(ROOT_DIR);
  console.log(chalk.gray(`Found ${files.length} TypeScript files to check\n`));
  
  for (const file of files) {
    checkFile(file);
  }
  
  console.log('\nSummary:');
  console.log(chalk.gray(`Files checked: ${filesChecked}`));
  console.log(chalk.yellow(`Warnings: ${warningCount}`));
  console.log(chalk.red(`Errors: ${errorCount}`));
  
  if (errorCount > 0) {
    console.log(chalk.red('\nVerification failed! Please fix the errors above.'));
    process.exit(1);
  } else if (warningCount > 0) {
    console.log(chalk.yellow('\nVerification completed with warnings. Consider addressing them.'));
  } else {
    console.log(chalk.green('\nType verification passed successfully!'));
  }
}

// Execute the script
main();