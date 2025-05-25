# Complete Product Wizard Field Mapping Analysis

This document provides a comprehensive analysis of ALL fields in the product wizard UI and their corresponding database mappings.

## 1. Basic Information Step Fields

### UI Fields → Database Schema Mapping

| UI Field | Draft Field | Target DB Field | Type | Notes |
|----------|-------------|-----------------|------|-------|
| Product Name | `name` | `products.name` | text | ✅ Mapped |
| Slug | `slug` | `products.slug` | text | ✅ Mapped |
| Description | `description` | `products.description` | text | ✅ Mapped |
| Category | `categoryId` | `products.category_id` | integer | ✅ Mapped |
| Supplier | `supplierId` | `products.supplier` | text | ⚠️ Type conversion needed |
| Catalog | `catalogId` | `products.catalog_id` | integer | ✅ Mapped |
| Regular Price | `regularPrice` | `products.price` | number | ✅ Mapped |
| Sale Price | `salePrice` | `products.sale_price` | number | ✅ Mapped |
| Cost Price | `costPrice` | `products.cost_price` | number | ✅ Mapped |
| On Sale | `onSale` | Calculated field | boolean | ⚠️ Needs logic |
| Stock Level | `stockLevel` | `products.stock` | integer | ✅ Mapped |
| Is Active | `isActive` | `products.is_active` | boolean | ✅ Mapped |
| Is Featured | `isFeatured` | `products.is_featured` | boolean | ✅ Mapped |

## 2. Images Step Fields

### UI Fields → Database Schema Mapping

| UI Field | Draft Field | Target DB Field | Type | Notes |
|----------|-------------|-----------------|------|-------|
| Image URLs | `imageUrls` | `products.image_url` + `products.additional_images` | text array | ✅ Mapped (first = main, rest = additional) |
| Main Image Index | `mainImageIndex` | Logic to set main image | integer | ✅ Mapped |

## 3. Additional Information Step Fields (MISSING!)

### Fields Currently NOT in Basic Step

| UI Field | Draft Field | Target DB Field | Type | Status |
|----------|-------------|-----------------|------|--------|
| Brand | `brand` | `products.brand` | text | ❌ Missing from UI |
| Weight | `weight` | `products.weight` | number | ❌ Missing from UI |
| Dimensions | `dimensions` | `products.dimensions` | text | ❌ Missing from UI |
| Free Shipping | `freeShipping` | `products.free_shipping` | boolean | ❌ Missing from UI |
| Minimum Order | Not implemented | `products.minimum_order` | integer | ❌ Missing from UI |
| Minimum Price | Not implemented | `products.minimum_price` | number | ❌ Missing from UI |

## 4. Attributes Step Fields

### UI Fields → Database Schema Mapping

| UI Field | Draft Field | Target DB Field | Type | Notes |
|----------|-------------|-----------------|------|-------|
| Selected Attributes | `selectedAttributes` | `product_attributes` table | jsonb | ✅ Mapped via SQL |
| Attribute Values | `attributeValues` | `product_attributes.selected_options` | jsonb | ✅ Mapped |
| Required Attributes | `requiredAttributeIds` | `products.required_attribute_ids` | integer array | ❌ Missing from publication |

## 5. SEO Step Fields

### UI Fields → Database Schema Mapping

| UI Field | Draft Field | Target DB Field | Type | Status |
|----------|-------------|-----------------|------|--------|
| Meta Title | `metaTitle` | Not in products table | text | ❌ Missing DB field |
| Meta Description | `metaDescription` | Not in products table | text | ❌ Missing DB field |
| Meta Keywords | `metaKeywords` | Not in products table | text | ❌ Missing DB field |
| Canonical URL | `canonicalUrl` | Not in products table | text | ❌ Missing DB field |

## 6. Sales & Promotions Step Fields (MISSING!)

### Fields Not Currently Implemented

| UI Field | Draft Field | Target DB Field | Type | Status |
|----------|-------------|-----------------|------|--------|
| Compare At Price | `compareAtPrice` | Not in products table | number | ❌ Missing from both |
| Tax Rate | `taxRatePercentage` | Not in products table | number | ❌ Missing from both |
| Discount Percentage | `markupPercentage` | `products.discount` | integer | ⚠️ Partial mapping |
| Discount Label | Not implemented | `products.discount_label` | text | ❌ Missing |
| Flash Deal | `isFlashDeal` | `products.is_flash_deal` | boolean | ✅ Mapped |
| Flash Deal End | Not implemented | `products.flash_deal_end` | text | ❌ Missing from UI |
| Special Sale Text | Not implemented | `products.special_sale_text` | text | ❌ Missing from UI |
| Special Sale Start | Not implemented | `products.special_sale_start` | text | ❌ Missing from UI |
| Special Sale End | Not implemented | `products.special_sale_end` | text | ❌ Missing from UI |

## 7. Tags and Categories

### UI Fields → Database Schema Mapping

| UI Field | Draft Field | Target DB Field | Type | Status |
|----------|-------------|-----------------|------|--------|
| Tags | `tags` | `products.tags` | text array | ❌ Missing from publication |

## Critical Issues Found

### 1. Missing Database Fields for SEO
The products table is missing SEO fields that are in the UI:
- `meta_title`
- `meta_description` 
- `meta_keywords`
- `canonical_url`

### 2. Missing UI Steps
- Additional Information step (brand, weight, dimensions, shipping)
- Complete Sales & Promotions step

### 3. Missing Field Mappings in Publication Service
- `tags` array
- `requiredAttributeIds` array
- `brand` field
- `weight` field  
- `dimensions` field
- `freeShipping` boolean
- All SEO fields
- Promotional pricing fields

### 4. Data Type Conversions Needed
- `supplierId` (integer) → `supplier` (text)
- Date fields need proper SAST timezone handling

## Recommended Fix Priority

1. **HIGH**: Add missing SEO fields to database schema
2. **HIGH**: Fix all missing field mappings in publication service
3. **MEDIUM**: Implement missing UI steps for complete functionality
4. **LOW**: Add advanced promotional pricing features