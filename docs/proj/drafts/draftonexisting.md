
# Creating Drafts for Existing Products

This document outlines the complete approach for creating and managing draft records when editing existing products in the TeeMeYou e-commerce platform.

## Overview

When a user selects "Edit" for an existing product in the catalog, the system should:

1. Check if a draft already exists for this product
2. If no draft exists, create a new draft based on the existing product data
3. Redirect the user to the product wizard with the draft loaded
4. Allow editing with changes saved back to the draft
5. On publish, apply changes to the original product

## Technical Implementation Flow

### 1. Initiating the Edit Process

When a user clicks the "Edit" option in the product catalog UI:

```
User clicks "Edit" on product → Check for existing draft → Create draft if needed → Open product wizard
```

### 2. Draft Creation from Existing Product

The system uses a specialized function `create_product_draft_from_product` to generate a draft from an existing product. This ensures all product data is properly mapped to the draft schema.

#### Core Implementation Logic

1. **Database Function Call**: The system calls the SQL function that loads all product data, including related tables
2. **Complete Data Mapping**: Maps fields from multiple tables (products, product_images, product_attributes) to draft schema
3. **Preserve Relationships**: Maintains relationships to categories, catalogs, suppliers, etc.
4. **Initialize Draft Status**: Sets draft status as "draft" with appropriate metadata

### 3. Key API Endpoints

The draft creation process relies on these endpoints:

- `POST /api/product-drafts/from-product/:productId`: Create a draft from an existing product
- `GET /api/product-drafts/:id`: Load a draft by ID
- `PATCH /api/product-drafts/:id/wizard-step`: Update specific sections of a draft
- `POST /api/product-drafts/:id/publish`: Publish changes back to the product tables

### 4. Data Mappings

When creating a draft from an existing product, the following field mappings are performed:

#### Products Table → Draft

| Product Field | Draft Field | Conversion Logic |
|---------------|-------------|------------------|
| id | originalProductId | Direct assignment |
| name | name | Direct copy |
| slug | slug | Direct copy |
| description | description | Direct copy |
| categoryId | categoryId | Direct copy |
| price | regularPrice | Direct copy |
| salePrice | salePrice | Direct copy |
| isActive | isActive | Direct copy |
| isFeatured | isFeatured | Direct copy |
| imageUrl | imageUrls[0] & mainImageIndex=0 | Add as first image |
| additionalImages | imageUrls[1+] | Append to images array |
| specialSaleText | specialSaleText | Direct copy |
| specialSaleStart | specialSaleStart | Convert to ISO string |
| specialSaleEnd | specialSaleEnd | Convert to ISO string |
| isFlashDeal | isFlashDeal | Direct copy |
| flashDealEnd | flashDealEnd | Convert to ISO string |
| metadata fields | metaTitle, metaDescription, etc. | Direct mapping |

#### Product Images → Draft

The system collects all product images and organizes them properly:

1. Main product image (from products.imageUrl) becomes first in the array
2. Additional images from product_images table are appended in correct order
3. Object keys are preserved for proper storage references
4. Image sorting order is maintained

#### Product Attributes → Draft

Attributes require special handling since they come from multiple tables:

1. Load all product attributes with their values
2. Map to draft.attributes array with proper structure:
   - attributeId
   - value (text or array of selected options)
   - attributeName and displayName
   - attributeType and validation info

### 5. Implementation Details

The server-side implementation handles this through the `createDraftFromProduct` function in storage.ts and related endpoints in product-draft-routes.ts.

Key components:

```typescript
// In product-draft-routes.ts
router.post(
  "/api/product-drafts/from-product/:productId",
  isAuthenticated,
  validateRequest({
    params: z.object({
      productId: z.string().transform((val) => parseInt(val, 10)),
    }),
  }),
  asyncHandler(async (req, res) => {
    const productId = parseInt(req.params.productId, 10);
    const userId = req.user?.id;
    
    // Create draft from existing product using SQL function
    const draft = await storage.createDraftFromProduct(productId, userId);
    
    sendSuccess(res, draft);
  })
);
```

The SQL function `create_product_draft_from_product` handles the complex mapping process:

```sql
-- This SQL function is called to create a draft from an existing product
-- It loads all product data, images, attributes, etc. and maps to draft schema
CREATE OR REPLACE FUNCTION create_product_draft_from_product(
  p_product_id INTEGER,
  p_user_id INTEGER
) RETURNS product_drafts AS $$
DECLARE
  v_draft product_drafts;
BEGIN
  -- Check for existing drafts first
  SELECT * INTO v_draft FROM product_drafts 
  WHERE original_product_id = p_product_id AND created_by = p_user_id
  AND draft_status IN ('draft', 'review');
  
  -- If draft exists, return it
  IF FOUND THEN
    RETURN v_draft;
  END IF;
  
  -- Otherwise create a new draft from product
  INSERT INTO product_drafts (
    original_product_id, 
    created_by,
    draft_status,
    name,
    slug,
    -- ...other fields mapped from product
  )
  SELECT
    p.id,
    p_user_id,
    'draft',
    p.name,
    p.slug,
    -- ...other fields selected from product
  FROM products p
  WHERE p.id = p_product_id
  RETURNING *;
  
  -- Additional processing for images and attributes happens in application code
  
  RETURN v_draft;
END;
$$ LANGUAGE plpgsql;
```

### 6. Client-Side Implementation

On the client side, the edit flow is handled by the admin UI:

1. When user clicks "Edit" on a product, it initiates a call to create a draft
2. After draft creation, redirects to the product wizard with the draft ID
3. The ProductWizard component loads the draft and presents it for editing
4. Changes are saved to the draft until publishing

## Best Practices

When implementing or modifying the draft-from-product system:

1. **Preserve All Data**: Ensure all product data including relationships are maintained
2. **Handle Attribute Complexity**: Special care for attribute mapping due to many-to-many relationship
3. **Image Management**: Preserve image ordering and references
4. **Atomic Operations**: Database operations should be atomic to prevent partial drafts
5. **Validation**: Validate draft data before publishing back to product tables

## Potential Issues

Be aware of these potential issues:

1. **Concurrent Edits**: Multiple users editing the same product can create conflicts
2. **Data Synchronization**: Changes to the original product while draft exists
3. **Attribute Schema Changes**: Changes to attribute definitions between draft creation and publishing
4. **Large Image Collections**: Products with many images may require pagination or chunked loading

## Conclusion

The draft system enables safe editing of existing products by creating a temporary copy that can be modified without affecting the live product until explicitly published. The implementation properly handles the complex relationships between products and their related data in attributes, images, and categories.
