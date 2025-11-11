# Production Migration Guide: Fix supplierId NOT NULL Constraint

## Problem
The production database has legacy products with `null` values in the `supplierId` column, preventing the NOT NULL constraint from being applied during deployment.

## Solution
This migration safely backfills all legacy products with an "Unknown Supplier" before applying the constraint.

## What This Migration Does

1. ✅ Creates an "Unknown Supplier" record (if it doesn't exist)
2. ✅ Updates all products with `null supplierId` to reference the Unknown Supplier
3. ✅ Verifies no null values remain
4. ✅ Applies the NOT NULL constraint to `products.supplierId`
5. ✅ Uses a transaction - rolls back if anything fails

## Testing Results

**Development Database:**
- ✅ Migration ran successfully
- ✅ Constraint applied: `supplierId` is now NOT NULL
- ✅ 0 products with null suppliers
- ✅ 3 legacy products assigned to "Unknown Supplier"

## Production Deployment Steps

### Option 1: Using psql (Recommended)

1. **Connect to your production database:**
   ```bash
   psql $PRODUCTION_DATABASE_URL
   ```

2. **Run the migration file:**
   ```sql
   \i migration-backfill-supplier-and-constraint.sql
   ```

3. **Verify the migration:**
   ```sql
   SELECT 
     COUNT(*) as total_products,
     COUNT("supplierId") as products_with_supplier,
     COUNT(*) FILTER (WHERE "supplierId" IS NULL) as null_suppliers,
     COUNT(*) FILTER (WHERE "supplierId" = (SELECT id FROM suppliers WHERE name = 'Unknown Supplier')) as legacy_products
   FROM products;
   ```

   **Expected Results:**
   - `total_products`: Your total product count
   - `products_with_supplier`: Same as total_products
   - `null_suppliers`: **0** (this must be zero!)
   - `legacy_products`: Number of products that were backfilled

### Option 2: Using Command Line

```bash
psql $PRODUCTION_DATABASE_URL -f migration-backfill-supplier-and-constraint.sql
```

## What to Expect

The migration will output messages like:
```
BEGIN
INSERT 0 1  (or 0 0 if Unknown Supplier already exists)
NOTICE:  Unknown Supplier ID: X
NOTICE:  Products to be updated: Y
NOTICE:  Updated Y products to use Unknown Supplier
NOTICE:  Verification passed: No products with null supplierId
ALTER TABLE
NOTICE:  Successfully applied NOT NULL constraint to products.supplierId
COMMIT
```

## Rollback Plan

If something goes wrong, the migration will automatically rollback due to the transaction wrapper. To manually verify or fix:

1. **Check for null suppliers:**
   ```sql
   SELECT COUNT(*) FROM products WHERE "supplierId" IS NULL;
   ```

2. **If you need to manually create the Unknown Supplier:**
   ```sql
   INSERT INTO suppliers (name, email, phone, address, is_active, created_at, updated_at)
   VALUES ('Unknown Supplier', 'legacy@heartcart.shop', '0000000000', 'Legacy Products', true, NOW()::text, NOW()::text);
   ```

3. **If you need to manually backfill:**
   ```sql
   UPDATE products 
   SET "supplierId" = (SELECT id FROM suppliers WHERE name = 'Unknown Supplier')
   WHERE "supplierId" IS NULL;
   ```

## Post-Migration

After the migration succeeds:

1. **Future deployments will work** - The NOT NULL constraint is now in place
2. **Legacy products are identifiable** - Query products with Unknown Supplier:
   ```sql
   SELECT * FROM products 
   WHERE "supplierId" = (SELECT id FROM suppliers WHERE name = 'Unknown Supplier');
   ```
3. **You can reassign legacy products** - Admin can later assign proper suppliers to these products

## Safety Features

- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Transactional** - All-or-nothing, automatic rollback on error
- ✅ **Verification** - Checks for null values before applying constraint
- ✅ **No data loss** - All products are preserved
- ✅ **Clear logging** - NOTICE messages show what's happening

## Support

If you encounter any issues:
1. Check the error message - the migration will explain what went wrong
2. Verify the database connection
3. Ensure you have sufficient permissions (CREATE, ALTER, UPDATE)
4. Contact support with the full error output
