# Product Draft to Production Tables Mapping

This document outlines the mapping between columns in the `product_drafts` table and the corresponding columns in the production tables (`products`, `product_images`, `product_attributes`, etc.). Having this reference helps ensure data consistency during the publishing process.

## Core Tables

### product_drafts → products

| product_drafts column | products column | Data Type Conversion | Notes |
|----------------------|-----------------|----------------------|-------|
| name | name | string → string | |
| slug | slug | string → string | Must be unique, auto-generated from name if not provided |
| sku | sku | string → string | |
| description | description | string → string | |
| brand | brand | string → string | |
| categoryId | categoryId | integer → integer | References categories.id |
| catalogId | catalogId | integer → integer | References catalogs.id |
| isActive | isActive | boolean → boolean | |
| isFeatured | isFeatured | boolean → boolean | |
| costPrice | costPrice | decimal → double | Requires conversion from string to number |
| regularPrice | price | decimal → double | Requires conversion from string to number |
| salePrice | salePrice | decimal → double | Requires conversion from string to number |
| onSale | onSale | boolean → boolean | |
| markupPercentage | markupPercentage | integer → integer | |
| minimumPrice | minimumPrice | decimal → double | Requires conversion from string to number |
| discountData | discount | JSON object → integer | Extract numeric value from JSON object |
| specialSaleText | specialSaleText | string → string | |
| specialSaleStart | specialSaleStart | timestamp → string | Convert timestamp to ISO string |
| specialSaleEnd | specialSaleEnd | timestamp → string | Convert timestamp to ISO string |
| isFlashDeal | isFlashDeal | boolean → boolean | |
| flashDealEnd | flashDealEnd | timestamp → string | Convert timestamp to ISO string |
| supplierId | supplier | integer → string | Get supplier name from supplierId |
| weight | weight | string → double | Convert string to number |
| dimensions | dimensions | string → string | |
| metaTitle | metaTitle | string → string | |
| metaDescription | metaDescription | string → string | |
| metaKeywords | tags | string → string[] | Split comma-delimited string into array |
| imageUrls[mainImageIndex] | imageUrl | string → string | Main image URL goes to products.imageUrl |
| imageUrls (except main) | additionalImages | string[] → string[] | All non-main images go to additionalImages |

### product_drafts → product_images

| product_drafts column | product_images column | Data Type Conversion | Notes |
|----------------------|----------------------|----------------------|-------|
| id → products.id | productId | integer → integer | Foreign key reference |
| imageUrls[i] | url | string → string | **Critical field**: Must use correct column name 'url' (not 'imageUrl') |
| imageObjectKeys[i] | objectKey | string → string | |
| mainImageIndex | isMain | integer → boolean | Set true if index matches mainImageIndex |
| i (array index) | sortOrder | integer → integer | Use array index as sort order |

### product_drafts → product_attributes

| product_drafts column | product_attributes column | Data Type Conversion | Notes |
|----------------------|---------------------------|----------------------|-------|
| attributes[i].attributeId | attributeId | integer → integer | Reference to attributes.id |
| attributes[i].options | selectedOptions | string[] or object[] → JSONB | Store selected attribute options |
| attributes[i].isRequired | isRequired | boolean → boolean | |
| attributes[i].attributeDisplayName | overrideDisplayName | string → string | Optional custom display name |

## Common Issues and Solutions

1. **Image URL Field Name Mismatch**:
   - **Problem**: Using incorrect column name 'imageUrl' instead of 'url' in product_images table
   - **Solution**: Always use 'url' column name when inserting into product_images table

2. **Image Main Flag Mismatch**:
   - **Problem**: Using incorrect column name 'isMainImage' instead of 'isMain' in product_images table
   - **Solution**: Always use 'isMain' column name when inserting into product_images table

3. **Discount Data Type Mismatch**:
   - **Problem**: product_drafts.discountData is a JSON object, but products.discount is an integer
   - **Solution**: Extract numeric value from JSON object before storing in products.discount

4. **Date Format Mismatch**:
   - **Problem**: product_drafts stores timestamps as Date objects, but products table expects ISO string
   - **Solution**: Convert Date objects to ISO strings before storing in products table

5. **Price Format Mismatch**:
   - **Problem**: price fields stored as decimal in product_drafts but as double in products
   - **Solution**: Ensure proper conversion using parseFloat() when transferring price data

## Testing Checklist

When publishing a product draft, always verify these critical conversions:

- [ ] Image URLs are correctly stored in product_images.url field
- [ ] Main image flag is correctly set using isMain field
- [ ] Discount value is correctly extracted and stored as integer
- [ ] All date fields are properly converted to ISO strings
- [ ] All numeric fields (prices, weight) are properly converted from string/decimal to appropriate numeric type
- [ ] Supplier name is correctly retrieved from supplierId

## Validation Queries

To validate proper publishing, use these queries:

```sql
-- Check product images for proper URL field usage
SELECT pi.id, pi.product_id, pi.url, pi.is_main 
FROM product_images pi
JOIN products p ON pi.product_id = p.id
WHERE p.id = [PUBLISHED_PRODUCT_ID]

-- Check discount conversion
SELECT id, name, price, sale_price, discount 
FROM products
WHERE id = [PUBLISHED_PRODUCT_ID]
```