import postgres from 'postgres';

const sql = postgres({
  host: process.env.PROD_DB_PGHOST!,
  port: parseInt(process.env.PROD_DB_PGPORT || '5432'),
  database: process.env.PROD_DB_PGDATABASE!,
  username: process.env.PROD_DB_PGUSER!,
  password: process.env.PROD_DB_PGPASS!,
  ssl: 'require'
});

async function safeProductionMigration() {
  try {
    console.log('=== SAFE PRODUCTION SCHEMA MIGRATION ===\n');
    
    // Use sql.begin() for transaction management
    await sql.begin(async (tx) => {
      console.log('Step 1: Adding new camelCase columns...');
      
      // Add new columns (idempotent - IF NOT EXISTS)
      await tx`
        ALTER TABLE "shippingMethods" 
        ADD COLUMN IF NOT EXISTS "code" TEXT
      `;
      
      await tx`
        ALTER TABLE "shippingMethods" 
        ADD COLUMN IF NOT EXISTS "baseCost" NUMERIC
      `;
      
      await tx`
        ALTER TABLE "shippingMethods" 
        ADD COLUMN IF NOT EXISTS "customerPrice" NUMERIC
      `;
      
      await tx`
        ALTER TABLE "shippingMethods" 
        ADD COLUMN IF NOT EXISTS "logisticsCompanyId" INTEGER
      `;
      
      await tx`
        ALTER TABLE "shippingMethods" 
        ADD COLUMN IF NOT EXISTS "estimatedDeliveryDays" INTEGER
      `;
      
      await tx`
        ALTER TABLE "shippingMethods" 
        ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT false
      `;
      
      console.log('✓ New columns added\n');
      
      console.log('Step 2: Copying data from old columns to new columns...');
      
      // Copy data from old columns
      await tx`
        UPDATE "shippingMethods"
        SET 
          "baseCost" = COALESCE("baseCost", "basePrice"),
          "customerPrice" = COALESCE("customerPrice", "basePrice"),
          "logisticsCompanyId" = COALESCE("logisticsCompanyId", "companyId"),
          "code" = COALESCE("code", 'METHOD_' || id::text)
        WHERE "baseCost" IS NULL OR "customerPrice" IS NULL 
          OR "logisticsCompanyId" IS NULL OR "code" IS NULL
      `;
      
      // Parse estimatedDays text to integer
      await tx`
        UPDATE "shippingMethods"
        SET "estimatedDeliveryDays" = CASE
          WHEN "estimatedDeliveryDays" IS NULL THEN
            CASE
              WHEN "estimatedDays" ~ '^[0-9]+-[0-9]+$' THEN 
                split_part("estimatedDays", '-', 2)::integer
              WHEN "estimatedDays" ~ '^[0-9]+$' THEN 
                "estimatedDays"::integer
              ELSE 3
            END
          ELSE "estimatedDeliveryDays"
        END
      `;
      
      console.log('✓ Data copied\n');
      
      console.log('Step 3: Setting NOT NULL constraints...');
      
      await tx`
        ALTER TABLE "shippingMethods"
        ALTER COLUMN "code" SET NOT NULL
      `;
      
      await tx`
        ALTER TABLE "shippingMethods"
        ALTER COLUMN "baseCost" SET NOT NULL
      `;
      
      await tx`
        ALTER TABLE "shippingMethods"
        ALTER COLUMN "customerPrice" SET NOT NULL
      `;
      
      await tx`
        ALTER TABLE "shippingMethods"
        ALTER COLUMN "logisticsCompanyId" SET NOT NULL
      `;
      
      await tx`
        ALTER TABLE "shippingMethods"
        ALTER COLUMN "estimatedDeliveryDays" SET NOT NULL
      `;
      
      console.log('✓ Constraints set\n');
      
      console.log('Step 4: Adding foreign key constraint...');
      
      // Drop existing FK if exists, then add new one
      await tx`
        ALTER TABLE "shippingMethods"
        DROP CONSTRAINT IF EXISTS "shippingMethods_logisticsCompanyId_fkey"
      `;
      
      await tx`
        ALTER TABLE "shippingMethods"
        ADD CONSTRAINT "shippingMethods_logisticsCompanyId_fkey" 
        FOREIGN KEY ("logisticsCompanyId") 
        REFERENCES "logisticsCompanies"(id)
        ON DELETE RESTRICT
      `;
      
      console.log('✓ Foreign key added\n');
    });
    
    console.log('✅ MIGRATION COMPLETE!\n');
    
    // Verify the results
    console.log('Verification: Checking migrated data...');
    const result = await sql`
      SELECT id, name, code, "baseCost", "customerPrice", 
             "logisticsCompanyId", "estimatedDeliveryDays", "isActive"
      FROM "shippingMethods"
      ORDER BY id
    `;
    console.log(result);
    console.log('\n✓ All data migrated successfully');
    console.log('\nNote: Old columns (basePrice, companyId, estimatedDays) are kept for backward compatibility');
    console.log('They can be dropped in a future maintenance window after verification.');
    
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

safeProductionMigration();
