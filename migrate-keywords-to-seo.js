/**
 * Comprehensive Migration Script: meta_keywords -> seoKeywords
 * Migrates all references from the old meta_keywords field to the new seoKeywords array
 */

import fs from 'fs';
import path from 'path';

const filesToUpdate = [
  // Server files
  'server/storage.ts',
  'server/product-publication-complete.ts',
  'server/product-draft-routes.ts',
  'server/seo-ai-service.ts',
  'server/south-african-seo-service.ts',
  
  // Client files
  'client/src/components/admin/product-wizard/steps/SEOStep.tsx',
  'client/src/components/admin/product-wizard/context.tsx',
  'client/src/components/admin/product-wizard/ProductWizard.tsx',
  'client/src/components/admin/product-wizard/steps/ReviewAndSaveStep.tsx',
  'client/src/components/admin/product-management/components/AiSeoSuggestions.tsx',
  'client/src/components/admin/product-management/DraftContext.tsx',
  
  // Shared files
  'shared/schema.ts',
  'shared/validation-schemas.ts'
];

const replacements = [
  // Database field references
  { from: /meta_keywords/g, to: 'seoKeywords' },
  { from: /metaKeywords/g, to: 'seoKeywords' },
  
  // Type references
  { from: /metaKeywords:\s*string/g, to: 'seoKeywords: string[]' },
  { from: /metaKeywords\?:\s*string/g, to: 'seoKeywords?: string[]' },
  { from: /metaKeywords:\s*text\("meta_keywords"\)/g, to: 'seoKeywords: text("seoKeywords").array()' },
  
  // SQL and database queries
  { from: /like\(products\.metaKeywords \|\| "", searchTerm\)/g, to: `sql\`'\${searchTerm}' = ANY(\${products.seoKeywords})\`` },
  { from: /like\(productDrafts\.metaKeywords \|\| "", searchTerm\)/g, to: `sql\`'\${searchTerm}' = ANY(\${productDrafts.seoKeywords})\`` },
  { from: /ilike\(productDrafts\.metaKeywords, searchTerm\)/g, to: `sql\`'\${searchTerm}' ILIKE ANY(\${productDrafts.seoKeywords})\`` },
  
  // String to array conversions
  { from: /metaKeywords\.split\(","\)\.map\(\(tag\) => tag\.trim\(\)\)/g, to: 'seoKeywords || []' },
  { from: /metaKeywords\.split\(','\)\.map\(k => k\.trim\(\)\)/g, to: 'seoKeywords || []' },
  { from: /metaKeywords\s*\?\s*metaKeywords\.split\(','\)\.map\(k => k\.trim\(\)\)\s*:\s*\[\]/g, to: 'seoKeywords || []' },
  
  // Form and validation updates
  { from: /metaKeywords:\s*''/g, to: "seoKeywords: []" },
  { from: /metaKeywords:\s*z\.string\(\)/g, to: "seoKeywords: z.array(z.string())" },
  { from: /'metaKeywords'/g, to: "'seoKeywords'" },
  { from: /"metaKeywords"/g, to: '"seoKeywords"' },
  
  // Database column mappings
  { from: /meta_keywords:\s*result\.meta_keywords/g, to: 'seoKeywords: result.seoKeywords' },
  { from: /metaKeywords:\s*productDrafts\.metaKeywords/g, to: 'seoKeywords: productDrafts.seoKeywords' },
];

function updateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  replacements.forEach(({ from, to }) => {
    if (content.match(from)) {
      content = content.replace(from, to);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`);
  }
}

console.log('🚀 Starting meta_keywords -> seoKeywords migration...\n');

filesToUpdate.forEach(updateFile);

console.log('\n🎉 Migration completed!');
console.log('\n📋 Summary of changes:');
console.log('- Converted meta_keywords database references to seoKeywords');
console.log('- Updated TypeScript types from string to string[]');
console.log('- Fixed SQL queries to work with array fields');
console.log('- Updated form validation schemas');
console.log('- Converted string splitting to array handling');