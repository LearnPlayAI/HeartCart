# Database Schema Naming Convention Analysis

## Overview
This document provides a comprehensive analysis of naming mismatches between the Drizzle ORM schema definitions and the actual PostgreSQL database structure. The analysis identifies inconsistencies between camelCase naming in the application code and snake_case naming in the database.

## Analysis Date
**Performed on:** May 29, 2025  
**Database:** PostgreSQL (Neon)  
**ORM:** Drizzle ORM

## Summary of Findings

### ✅ Tables with Consistent Naming
The following tables have consistent naming between schema and database:
- `aiRecommendations` - Recently fixed to use camelCase
- `aiSettings` - Recently fixed to use camelCase
- `users` - Mixed naming but functional
- `products` - Mixed naming but functional
- `categories` - Uses snake_case consistently
- `session` - Uses snake_case consistently

### ⚠️ Tables with Naming Mismatches

## Detailed Mismatch Analysis

### 1. Cart Items Table
**Database Table:** `cart_items`  
**Schema Definition:** `cart_items`  
**Status:** ❌ MISMATCH IN COLUMNS

| Database Column | Schema Field | Type Match | Issue |
|----------------|--------------|------------|--------|
| `userId` | `userId` | ✅ | Column uses camelCase |
| `productId` | `productId` | ✅ | Column uses camelCase |
| `quantity` | `quantity` | ✅ | Consistent |
| `itemPrice` | `itemPrice` | ✅ | Column uses camelCase |
| `createdAt` | `createdAt` | ❌ | Schema expects camelCase, DB has camelCase (timestamp type) |
| `updatedAt` | `updatedAt` | ❌ | Schema expects camelCase, DB has camelCase (timestamp type) |
| `attributeSelections` | `attributeSelections` | ✅ | Column uses camelCase |

**Impact:** Medium - Potential timestamp handling issues

### 2. Orders Table
**Database Table:** `orders`  
**Schema Definition:** `orders`  
**Status:** ✅ CONSISTENT

All columns use camelCase consistently between schema and database.

### 3. Order Items Table
**Database Table:** `orderItems`  
**Schema Definition:** `orderItems`  
**Status:** ✅ CONSISTENT

All columns use camelCase consistently between schema and database.

### 4. Product Images Table
**Database Table:** `product_images`  
**Schema Definition:** `product_images`  
**Status:** ✅ CONSISTENT

All columns use snake_case consistently between schema and database.

### 5. Pricing Table
**Database Table:** `pricing`  
**Schema Definition:** `pricing`  
**Status:** ✅ CONSISTENT

All columns use snake_case consistently between schema and database.

### 6. Suppliers Table
**Database Table:** `suppliers`  
**Schema Definition:** `suppliers`  
**Status:** ✅ CONSISTENT

All columns use snake_case consistently between schema and database.

### 7. Catalogs Table
**Database Table:** `catalogs`  
**Schema Definition:** `catalogs`  
**Status:** ✅ CONSISTENT

All columns use snake_case consistently between schema and database.

### 8. Attributes Table
**Database Table:** `attributes`  
**Schema Definition:** `attributes`  
**Status:** ✅ CONSISTENT

All columns use snake_case consistently between schema and database.

### 9. Attribute Options Table
**Database Table:** `attribute_options`  
**Schema Definition:** `attribute_options`  
**Status:** ✅ CONSISTENT

All columns use snake_case consistently between schema and database.

### 10. Product Attributes Table
**Database Table:** `product_attributes`  
**Schema Definition:** `product_attributes`  
**Status:** ⚠️ EXTRA COLUMN IN DATABASE

| Database Column | Schema Field | Type Match | Issue |
|----------------|--------------|------------|--------|
| `category_attribute_id` | N/A | ❌ | Column exists in DB but not in schema |

**Impact:** Low - Extra column not used by application

### 11. Batch Upload Tables (Not in Schema)
**Database Tables:** `batch_uploads`, `batch_upload_errors`  
**Schema Definition:** ❌ NOT DEFINED  
**Status:** ❌ MISSING FROM SCHEMA

These tables exist in the database but are not defined in the Drizzle schema:
- `batch_uploads` (26 columns)
- `batch_upload_errors` (8 columns)

**Impact:** High - Missing schema definitions for existing functionality

### 12. Product Drafts Table (Partially Defined)
**Database Table:** `product_drafts`  
**Schema Definition:** Partially defined in schema  
**Status:** ⚠️ INCOMPLETE DEFINITION

The schema definition appears to be incomplete compared to the extensive database structure (63 columns in DB).

## Critical Issues Identified

### 1. Missing Schema Definitions
- `batch_uploads` table (26 columns)
- `batch_upload_errors` table (8 columns)

### 2. Incomplete Schema Definitions
- `product_drafts` table has extensive database structure not fully reflected in schema

### 3. Resolved Issues
- ✅ AI tables (`aiRecommendations`, `aiSettings`) were successfully fixed to use camelCase
- ✅ Login delay issue caused by column mismatch has been resolved

## Key Findings

### Naming Convention Patterns
1. **Legacy tables** (suppliers, catalogs, categories, pricing) use snake_case consistently
2. **Newer tables** (orders, orderItems, users) use camelCase consistently  
3. **AI tables** were recently migrated from snake_case to camelCase
4. **Mixed approach** works when schema definitions match database structure

### No Critical Mismatches Found
After thorough analysis, most tables have consistent naming between schema and database. The recent AI table fix resolved the primary cause of the login delay issue.

## Recommendations

### Immediate Actions Required
1. **Add missing table definitions** for batch upload tables
2. **Complete product_drafts schema definition** to match database structure

### Medium Priority
1. **Document naming conventions** for future development
2. **Add schema validation tests** to prevent future mismatches

### Low Priority
1. **Consider standardizing** to either all camelCase or all snake_case for new tables
2. **Optimize schema organization**

## Migration Priority

### High Priority (Immediate)
- ✅ AI table naming issues - RESOLVED
- Add batch upload table definitions
- Complete product_drafts schema

### Medium Priority (Next Sprint)
- Add comprehensive schema documentation
- Implement schema validation

### Low Priority (Future)
- Consider full naming convention standardization

## Notes
- The recent fix to AI tables demonstrates successful resolution of naming mismatches
- All timestamp fields consistently use text type in database
- Foreign key relationships are correctly defined where schema exists
- Login performance issue has been resolved

---

## COMPLETE CAMELCASE CONVERSION PLAN

### Overview
This section provides a comprehensive plan to convert ALL snake_case naming to camelCase throughout the entire application, including database tables, columns, and all application code references.

### Tables Requiring Complete Conversion to camelCase

#### 1. `attribute_options` → `attributeOptions`
**Database Columns to Rename:**
- `attribute_id` → `attributeId`
- `display_value` → `displayValue`
- `sort_order` → `sortOrder`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`

#### 2. `attributes` → (already camelCase table name)
**Database Columns to Rename:**
- `display_name` → `displayName`
- `attribute_type` → `attributeType`
- `validation_rules` → `validationRules`
- `is_required` → `isRequired`
- `is_filterable` → `isFilterable`
- `is_comparable` → `isComparable`
- `is_swatch` → `isSwatch`
- `display_in_product_summary` → `displayInProductSummary`
- `sort_order` → `sortOrder`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`

#### 3. `batch_upload_errors` → `batchUploadErrors`
**Database Columns to Rename:**
- `batch_upload_id` → `batchUploadId`
- `created_at` → `createdAt`

#### 4. `batch_uploads` → `batchUploads`
**Database Columns to Rename:**
- `catalog_id` → `catalogId`
- `user_id` → `userId`
- `total_records` → `totalRecords`
- `processed_records` → `processedRecords`
- `success_count` → `successCount`
- `error_count` → `errorCount`
- `file_original_name` → `fileOriginalName`
- `file_name` → `fileName`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`
- `completed_at` → `completedAt`
- `last_processed_row` → `lastProcessedRow`
- `processing_strategy` → `processingStrategy`
- `retry_count` → `retryCount`
- `max_retries` → `maxRetries`
- `catalog_capacity` → `catalogCapacity`
- `catalog_current_count` → `catalogCurrentCount`
- `canceled_at` → `canceledAt`
- `paused_at` → `pausedAt`
- `resumed_at` → `resumedAt`
- `failed_at` → `failedAt`
- `started_at` → `startedAt`

#### 5. `cart_items` → `cartItems`
**Table Name Change:** `cart_items` → `cartItems`

#### 6. `catalogs` → (already camelCase table name)
**Database Columns to Rename:**
- `supplier_id` → `supplierId`
- `default_markup_percentage` → `defaultMarkupPercentage`
- `is_active` → `isActive`
- `cover_image` → `coverImage`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`
- `start_date` → `startDate`
- `end_date` → `endDate`

#### 7. `categories` → (already camelCase table name)
**Database Columns to Rename:**
- `image_url` → `imageUrl`
- `is_active` → `isActive`
- `parent_id` → `parentId`
- `display_order` → `displayOrder`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`

#### 8. `pricing` → (already camelCase table name)
**Database Columns to Rename:**
- `category_id` → `categoryId`
- `markup_percentage` → `markupPercentage`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`

#### 9. `product_attributes` → `productAttributes`
**Database Columns to Rename:**
- `product_id` → `productId`
- `attribute_id` → `attributeId`
- `category_attribute_id` → `categoryAttributeId` (or remove if unused)
- `override_display_name` → `overrideDisplayName`
- `override_description` → `overrideDescription`
- `is_required` → `isRequired`
- `sort_order` → `sortOrder`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`
- `selected_options` → `selectedOptions`
- `text_value` → `textValue`
- `price_adjustment` → `priceAdjustment`

#### 10. `product_drafts` → `productDrafts`
**Database Columns to Rename:** (63 columns total)
- `original_product_id` → `originalProductId`
- `draft_status` → `draftStatus`
- `created_by` → `createdBy`
- `created_at` → `createdAt`
- `last_modified` → `lastModified`
- `category_id` → `categoryId`
- `is_active` → `isActive`
- `is_featured` → `isFeatured`
- `cost_price` → `costPrice`
- `regular_price` → `regularPrice`
- `sale_price` → `salePrice`
- `on_sale` → `onSale`
- `markup_percentage` → `markupPercentage`
- `image_urls` → `imageUrls`
- `image_object_keys` → `imageObjectKeys`
- `main_image_index` → `mainImageIndex`
- `stock_level` → `stockLevel`
- `low_stock_threshold` → `lowStockThreshold`
- `backorder_enabled` → `backorderEnabled`
- `supplier_id` → `supplierId`
- `discount_label` → `discountLabel`
- `special_sale_text` → `specialSaleText`
- `special_sale_start` → `specialSaleStart`
- `special_sale_end` → `specialSaleEnd`
- `is_flash_deal` → `isFlashDeal`
- `flash_deal_end` → `flashDealEnd`
- `tax_class` → `taxClass`
- `meta_title` → `metaTitle`
- `meta_description` → `metaDescription`
- `meta_keywords` → `metaKeywords`
- `wizard_progress` → `wizardProgress`
- `catalog_id` → `catalogId`
- `minimum_price` → `minimumPrice`
- `attributes_data` → `attributesData`
- `canonical_url` → `canonicalUrl`
- `published_at` → `publishedAt`
- `published_version` → `publishedVersion`
- `has_ai_description` → `hasAiDescription`
- `has_ai_seo` → `hasAiSeo`
- `free_shipping` → `freeShipping`
- `shipping_class` → `shippingClass`
- `last_reviewer` → `lastReviewer`
- `rejection_reason` → `rejectionReason`
- `completed_steps` → `completedSteps`
- `change_history` → `changeHistory`
- `selected_attributes` → `selectedAttributes`
- `ai_suggestions` → `aiSuggestions`
- `discount_data` → `discountData`
- `review_count` → `reviewCount`

#### 11. `product_images` → `productImages`
**Database Columns to Rename:**
- `product_id` → `productId`
- `object_key` → `objectKey`
- `is_main` → `isMain`
- `has_bg_removed` → `hasBgRemoved`
- `bg_removed_url` → `bgRemovedUrl`
- `bg_removed_object_key` → `bgRemovedObjectKey`
- `sort_order` → `sortOrder`
- `created_at` → `createdAt`

#### 12. `products` → (already camelCase table name)
**Database Columns to Rename:**
- `category_id` → `categoryId`
- `sale_price` → `salePrice`
- `image_url` → `imageUrl`
- `additional_images` → `additionalImages`
- `review_count` → `reviewCount`
- `is_active` → `isActive`
- `is_featured` → `isFeatured`
- `is_flash_deal` → `isFlashDeal`
- `sold_count` → `soldCount`
- `free_shipping` → `freeShipping`
- `has_background_removed` → `hasBackgroundRemoved`
- `original_image_object_key` → `originalImageObjectKey`
- `cost_price` → `costPrice`
- `catalog_id` → `catalogId`
- `display_order` → `displayOrder`
- `created_at` → `createdAt`
- `flash_deal_end` → `flashDealEnd`
- `minimum_price` → `minimumPrice`
- `minimum_order` → `minimumOrder`
- `discount_label` → `discountLabel`
- `special_sale_text` → `specialSaleText`
- `special_sale_start` → `specialSaleStart`
- `special_sale_end` → `specialSaleEnd`
- `required_attribute_ids` → `requiredAttributeIds`
- `meta_title` → `metaTitle`
- `meta_description` → `metaDescription`
- `meta_keywords` → `metaKeywords`
- `canonical_url` → `canonicalUrl`
- `compare_at_price` → `compareAtPrice`
- `tax_rate_percentage` → `taxRatePercentage`

#### 13. `suppliers` → (already camelCase table name)
**Database Columns to Rename:**
- `contact_name` → `contactName`
- `is_active` → `isActive`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`

#### 14. `users` → (already camelCase table name)
**Database Columns to Rename:**
- `last_login` → `lastLogin`

### Application Code Files Requiring Updates

#### Schema Files
1. **shared/schema.ts** (Lines 180-343)
   - Update all table definitions to use camelCase column names
   - Update all column references in relations

#### Migration/Database Scripts
2. **scripts/timezone-migration.ts** (Lines 20-38)
   - Update table names: `cart_items` → `cartItems`, `product_images` → `productImages`
   - Update column references to camelCase throughout

3. **scripts/validate-schema.ts** (Lines 45-75)
   - Update naming convention validation to expect camelCase
   - Update table and column name references

4. **migration-schema-sync.sql** (Lines 5-20)
   - Update all table and column references to camelCase

#### Documentation Files
5. **docs/proj/drafts/mappings.md** (Lines 15-45)
   - Update all table and column references to camelCase

6. **docs/type-definitions.md** (Lines 120-180)
   - Update all type definitions to use camelCase field names

#### Server Files
7. **server/storage.ts** (Lines 850-900)
   - Update all database queries to use camelCase table and column names
   - Update join references and field selections

8. **server/routes.ts** (Lines 1200-1250)
   - Update all database operation calls to use camelCase names

### Database Migration Script Required

```sql
-- Step 1: Rename tables
ALTER TABLE attribute_options RENAME TO "attributeOptions";
ALTER TABLE batch_upload_errors RENAME TO "batchUploadErrors";
ALTER TABLE batch_uploads RENAME TO "batchUploads";
ALTER TABLE cart_items RENAME TO "cartItems";
ALTER TABLE product_attributes RENAME TO "productAttributes";
ALTER TABLE product_drafts RENAME TO "productDrafts";
ALTER TABLE product_images RENAME TO "productImages";

-- Step 2: Rename columns (example for attributeOptions table)
ALTER TABLE "attributeOptions" RENAME COLUMN attribute_id TO "attributeId";
ALTER TABLE "attributeOptions" RENAME COLUMN display_value TO "displayValue";
ALTER TABLE "attributeOptions" RENAME COLUMN sort_order TO "sortOrder";
ALTER TABLE "attributeOptions" RENAME COLUMN created_at TO "createdAt";
ALTER TABLE "attributeOptions" RENAME COLUMN updated_at TO "updatedAt";

-- (Continue for all tables and columns...)
```

### Implementation Strategy
1. **Create complete database migration script** with all table and column renames
2. **Update all schema definitions** in shared/schema.ts
3. **Update all application code** to use new camelCase names
4. **Test thoroughly** to ensure no functionality is broken
5. **Deploy with rollback plan** in case of issues

### Risk Mitigation
- Create complete database backup before migration
- Test migration on development database first
- Update all code simultaneously to prevent inconsistencies
- Have rollback SQL script ready

---

**Document Version:** 2.0  
**Last Updated:** May 29, 2025  
**Status:** Complete Conversion Plan Ready