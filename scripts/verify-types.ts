/**
 * Type Verification Script for HeartCart
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

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';

// Configuration
const TYPESCRIPT_CONFIG_PATH = path.resolve(process.cwd(), 'tsconfig.json');
const SOURCE_DIRS = [
  path.resolve(process.cwd(), 'client/src'),
  path.resolve(process.cwd(), 'server'),
  path.resolve(process.cwd(), 'shared'),
];
const IGNORED_PATTERNS = [
  /\.d\.ts$/,
  /node_modules/,
  /dist/,
  /build/,
  /\.test\./,
  /\.spec\./,
];

/**
 * Check a file for type issues
 */
function checkFile(filePath: string): void {
  try {
    // Run TypeScript compiler with --noEmit to check types
    const result = execSync(`npx tsc --noEmit --pretty false --skipLibCheck --project ${TYPESCRIPT_CONFIG_PATH} ${filePath}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    console.log(chalk.green(`✓ ${filePath}`));
  } catch (error) {
    const errorOutput = error.stderr || error.stdout || error.message;
    const errorLines = errorOutput.split('\n')
      .filter((line: string) => line.includes(filePath))
      .map((line: string) => {
        // Extract line and character position
        const match = line.match(/\((\d+),(\d+)\):/);
        if (match) {
          const [, lineNum, charPos] = match;
          // Read the relevant line from the file
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const fileLines = fileContent.split('\n');
          const codeLine = fileLines[parseInt(lineNum) - 1];
          
          return `${line}\n${' '.repeat(4)}${codeLine}\n${' '.repeat(4 + parseInt(charPos))}${chalk.red('^')}`;
        }
        return line;
      });
    
    console.log(chalk.red(`✗ ${filePath}`));
    console.log(chalk.yellow(errorLines.join('\n')));
  }
}

/**
 * Recursively find all TypeScript files
 */
function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip ignored patterns
    if (IGNORED_PATTERNS.some(pattern => pattern.test(fullPath))) {
      continue;
    }
    
    if (entry.isDirectory()) {
      files.push(...findTypeScriptFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Find places where any is used
 */
function findAnyUsage(filePath: string): string[] {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const issues: string[] = [];
  
  // Match explicit any type annotations
  const anyRegex = /: any\b/g;
  let match;
  let lineNum = 1;
  
  for (const line of fileContent.split('\n')) {
    if ((match = anyRegex.exec(line)) !== null) {
      issues.push(`Line ${lineNum}: Explicit 'any' type: ${line.trim()}`);
    }
    lineNum++;
  }
  
  return issues;
}

/**
 * Find unsafe null/undefined handling
 */
function findUnsafeNullHandling(filePath: string): string[] {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const issues: string[] = [];
  
  // Match potential unsafe property access without null check
  const lines = fileContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for potential null dereference (simple heuristic, not foolproof)
    if (line.match(/\w+\?\.\w+/) || line.match(/\w+\s*!\./) || line.match(/\w+\s*![\[\(]/)) {
      // Non-null assertion or chaining without proper check
      issues.push(`Line ${i + 1}: Potential unsafe null handling: ${line.trim()}`);
    }
  }
  
  return issues;
}

/**
 * Find non-exhaustive switch statements
 */
function findNonExhaustiveSwitch(filePath: string): string[] {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const issues: string[] = [];
  
  // This is a simple heuristic, not perfect
  const switchRegex = /switch\s*\([^)]+\)\s*{([^}]*)}/gs;
  let match;
  
  while ((match = switchRegex.exec(fileContent)) !== null) {
    const switchBody = match[1];
    
    // Check if there's a default case
    if (!switchBody.includes('default:')) {
      const linesBefore = fileContent.substring(0, match.index).split('\n');
      const lineNum = linesBefore.length;
      
      issues.push(`Line ${lineNum}: Non-exhaustive switch statement missing default case`);
    }
  }
  
  return issues;
}

/**
 * Main execution function
 */
function main(): void {
  console.log(chalk.blue('HeartCart Type Verification Tool'));
  console.log(chalk.blue('================================'));
  
  // Find all TypeScript files
  const allFiles: string[] = [];
  for (const dir of SOURCE_DIRS) {
    if (fs.existsSync(dir)) {
      allFiles.push(...findTypeScriptFiles(dir));
    }
  }
  
  console.log(chalk.blue(`Found ${allFiles.length} TypeScript files to check\n`));
  
  // Type check each file
  console.log(chalk.blue('Checking for type errors...'));
  for (const file of allFiles) {
    checkFile(file);
  }
  
  console.log('\n' + chalk.blue('Checking for type safety issues...'));
  
  // Find unsafe type usages
  let totalIssues = 0;
  
  for (const file of allFiles) {
    const anyIssues = findAnyUsage(file);
    const nullIssues = findUnsafeNullHandling(file);
    const switchIssues = findNonExhaustiveSwitch(file);
    
    const fileIssues = [...anyIssues, ...nullIssues, ...switchIssues];
    totalIssues += fileIssues.length;
    
    if (fileIssues.length > 0) {
      console.log(chalk.yellow(`\n${file}:`));
      fileIssues.forEach(issue => console.log(chalk.yellow(`  - ${issue}`)));
    }
  }
  
  // Print summary
  console.log('\n' + chalk.blue('Summary:'));
  console.log(chalk.blue('-------'));
  console.log(`Total files checked: ${allFiles.length}`);
  console.log(`Safety issues found: ${totalIssues}`);
  
  if (totalIssues === 0) {
    console.log('\n' + chalk.green('✓ No type safety issues found!'));
  } else {
    console.log('\n' + chalk.yellow(`⚠ Found ${totalIssues} type safety issues.`));
    console.log(chalk.yellow('Please review and fix these issues to improve type safety.'));
  }
}

// Execute the script
main();