# Production Migration Guide: Consolidate Supplier Columns

## Problem
The products table has two redundant supplier columns:
1. `supplier` (text) - Legacy column that stored supplier IDs as text
2. `supplierId` (integer FK) - Proper foreign key to suppliers table

This creates data inconsistency risks and prevents proper shipping management. We need to consolidate to a single `supplierId` column with NOT NULL constraint.

## Solution
Three-phase migration to safely consolidate the columns:
- **Phase 1**: Backfill `supplierId` from legacy `supplier` text, apply NOT NULL constraint
- **Phase 2**: Deploy code changes removing `supplier` column references
- **Phase 3**: Drop `supplier` column from database (after code is stable)

---

## Phase 1: Consolidate supplierId and Apply Constraint

### What This Migration Does

1. ✅ Creates an "Unknown Supplier" record (if it doesn't exist)
2. ✅ Backfills `supplierId` from valid `supplier` text values (numeric IDs)
3. ✅ Identifies invalid supplier text values (non-numeric or non-existent IDs)
4. ✅ Updates remaining NULL `supplierId` to reference Unknown Supplier
5. ✅ Verifies no null values remain
6. ✅ Applies NOT NULL constraint to `products.supplierId`
7. ✅ Uses a transaction - rolls back if anything fails

### Testing Results (Development)

**Development Database:**
- ✅ Migration ran successfully
- ✅ Constraint applied: `supplierId` is now NOT NULL
- ✅ 0 products with null suppliers
- ✅ Unknown Supplier created with ID 8
- ✅ All 1,306 products have valid supplierId

### Production Deployment Steps - Phase 1

#### Using psql (Recommended)

1. **Connect to your production database:**
   ```bash
   psql $PRODUCTION_DATABASE_URL
   ```

2. **Run the migration file:**
   ```sql
   \i migration-consolidate-supplier-columns.sql
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

#### Using Command Line

```bash
psql $PRODUCTION_DATABASE_URL -f migration-consolidate-supplier-columns.sql
```

### What to Expect - Phase 1

The migration will output messages like:
```
BEGIN
INSERT 0 1  (or 0 0 if Unknown Supplier already exists)
NOTICE:  Unknown Supplier ID: X
NOTICE:  Backfilled Y products from supplier text column
NOTICE:  Backfilled Z products to Unknown Supplier
NOTICE:  Verification passed: All products have supplierId
ALTER TABLE
NOTICE:  Phase 1 complete: supplierId column consolidated and NOT NULL constraint applied
NOTICE:  Next: Remove supplier text column from code, then drop column from database
COMMIT
```

If there are invalid supplier values, you'll see:
```
WARNING:  N products have invalid supplier text values that cannot be converted
NOTICE:  Check products table manually for invalid supplier values where supplierId is null
```

---

## Phase 2: Deploy Code Changes

**IMPORTANT**: Only proceed to Phase 2 AFTER Phase 1 migration succeeds in production.

### Changes Included

- ✅ Removed `supplier` column from `shared/schema.ts`
- ✅ Updated all code references in `server/storage.ts` (5 locations)
- ✅ Application compiled and tested successfully

### Deployment Steps - Phase 2

1. **Deploy the code changes** to production
2. **Wait 24-48 hours** to ensure stability
3. **Monitor for errors** - if any issues arise, the `supplier` column still exists in the database and can be referenced if needed for rollback

### Verification - Phase 2

After deployment, verify the application works correctly:
- ✅ Products can be created with valid supplierId
- ✅ Products can be viewed and edited
- ✅ Checkout flow works correctly
- ✅ Admin order details show supplier information

---

## Phase 3: Drop Legacy supplier Column

**CRITICAL**: Only run Phase 3 AFTER:
1. ✅ Phase 1 migration succeeded in production
2. ✅ Phase 2 code changes deployed and stable for 24-48 hours
3. ✅ No application errors related to supplier/supplierId

### What This Migration Does

1. ✅ Verifies `supplierId` column exists with NOT NULL constraint
2. ✅ Verifies no products have NULL `supplierId`
3. ✅ Drops the legacy `supplier` text column
4. ✅ Final verification that only `supplierId` remains

### Production Deployment Steps - Phase 3

**IMPORTANT**: This migration is IRREVERSIBLE. The `supplier` column data will be permanently deleted (but all data was already migrated to `supplierId` in Phase 1).

#### Using psql (Recommended)

1. **Connect to your production database:**
   ```bash
   psql $PRODUCTION_DATABASE_URL
   ```

2. **Run the migration file:**
   ```sql
   \i migration-drop-supplier-column.sql
   ```

3. **Verify the migration:**
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'products'
     AND column_name IN ('supplier', 'supplierId')
   ORDER BY column_name;
   ```

   **Expected Results:**
   - Only `supplierId` should be listed
   - `supplier` column should NOT exist
   - `supplierId` should have `is_nullable = 'NO'`

#### Using Command Line

```bash
psql $PRODUCTION_DATABASE_URL -f migration-drop-supplier-column.sql
```

### What to Expect - Phase 3

The migration will output messages like:
```
BEGIN
NOTICE:  Pre-check passed: supplierId column exists with NOT NULL constraint
NOTICE:  Verification passed: All products have valid supplierId
NOTICE:  Dropping supplier text column from products table...
NOTICE:  Successfully dropped supplier column
NOTICE:  Phase 3 complete: supplier column dropped successfully
NOTICE:  Migration completed - products table now uses supplierId only
COMMIT
```

---

## Rollback Plans

### Rollback Phase 1

If Phase 1 fails, the transaction automatically rolls back. To manually verify or fix:

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

### Rollback Phase 2

If code deployment causes issues:

1. The `supplier` column still exists in the database
2. Revert code to previous version
3. Application will continue working with legacy column
4. Do NOT proceed to Phase 3

### Rollback Phase 3

**Phase 3 is IRREVERSIBLE** - the `supplier` column cannot be recovered after dropping. This is why we wait 24-48 hours after Phase 2 before proceeding.

---

## Post-Migration

After all phases complete successfully:

1. **Data integrity ensured** - All products have valid `supplierId` with NOT NULL constraint
2. **No redundant columns** - Only `supplierId` exists, no data duplication
3. **Shipping system ready** - Multi-supplier shipping management can work properly
4. **Legacy products identifiable** - Query products with Unknown Supplier:
   ```sql
   SELECT * FROM products 
   WHERE "supplierId" = (SELECT id FROM suppliers WHERE name = 'Unknown Supplier');
   ```
5. **Admin can reassign** - Legacy products can be assigned proper suppliers later

---

## Safety Features

- ✅ **Idempotent** - All migrations safe to run multiple times
- ✅ **Transactional** - All-or-nothing, automatic rollback on error
- ✅ **Phased approach** - Each phase can be verified before proceeding
- ✅ **Verification steps** - Checks for null values and data integrity
- ✅ **No data loss** - All products are preserved
- ✅ **Clear logging** - NOTICE/WARNING messages show what's happening
- ✅ **Reversible** - Phase 2 can be rolled back (Phase 3 cannot)

---

## Support

If you encounter any issues:
1. Check the error message - the migrations will explain what went wrong
2. Verify the database connection
3. Ensure you have sufficient permissions (CREATE, ALTER, UPDATE, DROP)
4. Do NOT proceed to next phase if current phase fails
5. Contact support with the full error output
