# TeeMeYou Error Handling Implementation Roadmap

## Overview

This document outlines the consistent error handling pattern to be applied across all functions in the TeeMeYou application. The focus is on implementing the same successful approach used in the product deletion functionality to all other functions, ensuring proper operation of all create, read, update, and delete operations.

## The Golden Pattern - How Product Deletion Works

The product deletion implementation consists of three key components working together:

1. **Storage Layer Implementation**:
```typescript
async deleteProduct(id: number): Promise<boolean> {
  try {
    // First, get all product images to delete them from object storage
    const productImagesData = await this.getProductImages(id);
    
    // Delete each image with proper error handling for each step
    for (const image of productImagesData) {
      try {
        await this.deleteProductImage(image.id);
      } catch (imageError) {
        console.error(`Error deleting product image ID ${image.id}:`, imageError);
        // Continue with deletion even if a specific image deletion fails
      }
    }
    
    // Clean up associated resources with proper error handling
    try {
      const productFolderPrefix = `${STORAGE_FOLDERS.PRODUCTS}/${id}/`;
      const filesList = await objectStore.listFiles(productFolderPrefix, true);
      // ... more cleanup code
    } catch (folderError) {
      console.error(`Error listing product files for cleanup:`, folderError);
      // Continue with deletion even if listing fails
    }
    
    // Finally delete the product itself
    await db.delete(products).where(eq(products.id, id));
    
    return true;
  } catch (error) {
    console.error(`Error deleting product ${id}:`, error);
    throw error; // Rethrow so the route handler can catch it
  }
}
```

2. **Route Handler Implementation**:
```typescript
app.delete(
  "/api/products/:id", 
  isAuthenticated, 
  validateRequest({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Verify permissions
    if (user.role !== 'admin') {
      throw new ForbiddenError("Only administrators can delete products");
    }
    
    const productId = Number(req.params.id);
    
    // Verify resource exists
    const existingProduct = await storage.getProductById(productId, { includeInactive: true });
    if (!existingProduct) {
      throw new NotFoundError(`Product with ID ${productId} not found`, 'product');
    }
    
    try {
      // Perform the operation
      const success = await storage.deleteProduct(productId);
      
      // Return structured response
      res.json({ 
        success, 
        message: `Product "${existingProduct.name}" was successfully deleted along with all associated images and data.` 
      });
    } catch (error) {
      // Proper error handling
      logger.error('Error deleting product:', { error, productId });
      throw new AppError(
        "An error occurred while deleting the product. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }
  })
);
```

3. **Usage of Built-in Error Handling Utilities**:
   - `asyncHandler` to automatically catch and forward errors to the global error handler
   - `validateRequest` middleware to validate request parameters
   - Custom error classes (`ForbiddenError`, `NotFoundError`, `AppError`) for specific error types
   - Structured error responses with meaningful error messages

## Implementation Roadmap - All Methods

The following operations need to be updated to follow this pattern:

### Phase 1: Critical Product Operations - ✅ COMPLETED

1. **Create Product** (`/api/products` POST) - ✅ COMPLETED
   - Follow validateRequest pattern
   - Use asyncHandler for route handling
   - Add explicit error handling in storage layer
   - Return proper success response with created product information

2. **Update Product** (`/api/products/:id` PUT) - ✅ COMPLETED
   - Validate existence of product before update
   - Use proper error classes and messages
   - Add detailed error handling for all associated operations

3. **Product Image Operations** (all routes) - ✅ COMPLETED
   - Standardize error handling for upload, update, delete
   - Add proper logging and context info for all image operations
   - Ensure permissions are properly validated

### Phase 2: Catalog and Category Operations - ✅ COMPLETED

1. **Create/Update/Delete Catalog** (all routes) - ✅ COMPLETED
   - Apply consistent validation pattern 
   - Ensure proper error handling for category-product relationships
   - Add context to error messages including IDs

2. **Create/Update/Delete Category** (all routes) - ✅ COMPLETED
   - Implement consistent error handling with hierarchical validation
   - Ensure proper handling of child categories
   - Add context to error messages

### Phase 3: Attribute-Related Operations - 🔄 IN PROGRESS

1. **All Attribute Operations** (global, catalog, category, product) - 🔄 IN PROGRESS
   - ✅ Global attribute operations (create, read, update, delete)
   - ✅ Attribute options operations (create, read, update, delete)
   - ✅ Category attribute operations (create, read, update, delete)
   - ✅ Category attribute options operations (create, read, update, delete, reorder)
   - ✅ Product attribute operations (create, read, update, delete)
   - ✅ Product attribute options operations (create, read, update, delete, reorder)
   - 🔄 Product attribute values operations (create, read, update, delete)
   - ✅ Attribute discount rules operations (get all, get by ID, get by product/catalog/category/attribute, create, update, delete, calculate price)

2. **Attribute Value Operations** - 🔄 IN PROGRESS
   - ✅ Verify input validation is consistent
   - ✅ Add detailed error logging and context
   - 🔄 Ensure proper response structure

### Phase 4: Cart and Order Operations - ❌ NOT STARTED

1. **Cart Operations** (add, update, remove) - ❌ NOT STARTED
   - Verify stock availability with proper error messages
   - Standardize error responses for cart operation failures
   - Add context to error messages

2. **Order Operations** (create, update, cancel) - ❌ NOT STARTED
   - Implement transaction support to ensure data integrity
   - Add detailed error handling for payment processing
   - Ensure proper response structure for success/failure

### Phase 5: User and Authentication Operations - ❌ NOT STARTED

1. **User Operations** (register, update, delete) - ❌ NOT STARTED
   - Add proper validation and error handling
   - Ensure proper permission checking
   - Add detailed error context

2. **Authentication Operations** (login, logout) - ❌ NOT STARTED
   - Standardize error handling for auth failures
   - Implement proper validation
   - Add security-related logging

## Implementation Guidelines

When updating each method, follow these guidelines derived from the successful product deletion pattern:

1. **Storage Layer Pattern**:
```typescript
async someOperation(id: number): Promise<ReturnType> {
  try {
    // Implementation
    
    // If operating on multiple related resources, use nested try/catch
    try {
      // Operation on related resource
    } catch (specificError) {
      logger.error(`Error in specific operation: ${specificError}`);
      // Decision: continue or abort the overall operation
    }
    
    return result;
  } catch (error) {
    logger.error(`Error in someOperation for ID ${id}:`, error);
    throw error; // Always rethrow for proper handling in route
  }
}
```

2. **Route Handler Pattern**:
```typescript
app.method(
  "/api/resource/:id",
  authMiddleware,
  validateRequest({ ... }),
  asyncHandler(async (req: Request, res: Response) => {
    // 1. Validate permissions
    
    // 2. Extract and validate parameters
    
    // 3. Check if resource exists (for update/delete)
    
    // 4. Try operation
    try {
      const result = await storage.someOperation(id);
      
      // 5. Return success response
      res.json({
        success: true,
        data: result,
        message: "Operation completed successfully"
      });
    } catch (error) {
      // 6. Proper error handling
      logger.error('Operation failed:', { error, contextInfo });
      throw new AppError(
        "Specific error message explaining what happened",
        ErrorCode.APPROPRIATE_ERROR_CODE,
        statusCode
      );
    }
  })
);
```

## Testing Strategy

For each updated method:
1. Test normal operation path
2. Test proper error handling for invalid inputs
3. Test proper error handling for non-existent resources
4. Test proper error handling for permission issues
5. Test proper error handling for dependent resource operations

## Additional Requirements

1. Always include entity IDs in error messages for easier debugging
2. Use the standardized response format for all API responses
3. Log errors with appropriate context
4. Use custom error classes from error-handler.ts
5. Always wrap async route handlers with asyncHandler