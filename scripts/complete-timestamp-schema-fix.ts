/**
 * Complete Timestamp Schema Fix Script
 * 
 * This script provides a comprehensive analysis and fix for all timestamp-related
 * schema mismatches between the TypeScript schema and the actual database structure.
 * 
 * The root cause: Database has ALL timestamp fields as 'text' type, but TypeScript
 * schema defines them as 'timestamp' type, causing "toISOString is not a function" errors.
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function analyzeTimestampMismatches() {
  console.log("🔍 Analyzing timestamp field mismatches...\n");
  
  // Get all timestamp fields from the database
  const timestampFields = await db.execute(sql`
    SELECT 
      table_name, 
      column_name, 
      data_type, 
      is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND column_name IN ('created_at', 'updated_at', 'published_at', 'flash_deal_end', 'special_sale_start', 'special_sale_end', 'last_modified', 'last_login')
    ORDER BY table_name, column_name;
  `);

  console.log("📊 Database timestamp fields analysis:");
  console.log("=====================================");
  
  const textFields: string[] = [];
  const timestampFields_: string[] = [];
  
  for (const field of timestampFields) {
    const { table_name, column_name, data_type } = field;
    const fieldRef = `${table_name}.${column_name}`;
    
    if (data_type === 'text') {
      textFields.push(fieldRef);
      console.log(`✓ ${fieldRef} - TEXT (correct)`);
    } else if (data_type.includes('timestamp')) {
      timestampFields_.push(fieldRef);
      console.log(`❌ ${fieldRef} - ${data_type.toUpperCase()} (needs fixing)`);
    }
  }
  
  console.log(`\n📈 Summary:`);
  console.log(`- Text fields (correct): ${textFields.length}`);
  console.log(`- Timestamp fields (need fixing): ${timestampFields_.length}`);
  
  if (timestampFields_.length > 0) {
    console.log(`\n🚨 Fields that need schema updates:`);
    timestampFields_.forEach(field => console.log(`   - ${field}`));
  }
  
  return { textFields, timestampFields: timestampFields_ };
}

async function generateSchemaFixes(mismatches: { textFields: string[], timestampFields: string[] }) {
  console.log("\n🔧 Generating TypeScript schema fixes...\n");
  
  const fixes = [
    "// The following timestamp fields should be changed from:",
    "// timestamp('field_name', { withTimezone: true }).defaultNow().notNull()",
    "// to:",
    "// text('field_name').default(String(new Date().toISOString())).notNull()",
    "",
    "// Tables that need fixing in shared/schema.ts:",
  ];
  
  const tablesNeedingFixes = new Set();
  mismatches.timestampFields.forEach(field => {
    const tableName = field.split('.')[0];
    tablesNeedingFixes.add(tableName);
  });
  
  tablesNeedingFixes.forEach(table => {
    fixes.push(`// - ${table} table`);
  });
  
  console.log(fixes.join('\n'));
  
  return fixes;
}

async function main() {
  try {
    console.log("🚀 Starting comprehensive timestamp schema analysis...\n");
    
    const mismatches = await analyzeTimestampMismatches();
    await generateSchemaFixes(mismatches);
    
    console.log("\n✅ Analysis complete!");
    console.log("\n💡 Next steps:");
    console.log("1. Update all timestamp fields in shared/schema.ts to use text() instead of timestamp()");
    console.log("2. Ensure all publication services pass string values instead of Date objects");
    console.log("3. Test product publication after schema fixes");
    
  } catch (error) {
    console.error("❌ Analysis failed:", error);
  }
}

if (require.main === module) {
  main();
}