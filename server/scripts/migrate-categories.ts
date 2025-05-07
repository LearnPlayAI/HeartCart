import { db } from "../db";
import { categories } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";

/**
 * This script performs the migration of existing categories to the new hierarchical structure.
 * It updates all existing categories to be main categories (level 0) if they don't have a parentId.
 */
async function migrateCategoriesHierarchy() {
  console.log("🔄 Starting migration of categories to hierarchical structure...");

  try {
    // 1. First set all categories with null parentId to level 0 (main categories)
    const result = await db
      .update(categories)
      .set({ level: 0 })
      .where(isNull(categories.parentId))
      .returning();
    
    console.log(`✅ Successfully updated ${result.length} main categories to level 0`);

    // 2. Update all categories with a parentId to be level 1 (subcategories)
    const subCatResult = await db
      .update(categories)
      .set({ level: 1 })
      .where(eq(categories.level, 0).not())
      .returning();
    
    console.log(`✅ Successfully identified ${subCatResult.length} subcategories and set to level 1`);

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error migrating categories:", error);
  }
}

// Execute the migration when this script is run directly
if (require.main === module) {
  migrateCategoriesHierarchy()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

export { migrateCategoriesHierarchy };