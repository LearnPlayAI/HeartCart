import { Express, Request, Response } from "express";
import { z, ZodError } from "zod";
import { storage } from "./storage";
import { isAdmin } from "./auth-middleware";
import { sendSuccess, sendError } from "./api-response";
import { logger } from "./logger";
import { 
  AppError, 
  ErrorCode, 
  NotFoundError,
  ForbiddenError,
  asyncHandler
} from "./error-handler";
import { validateRequest } from "./validation-middleware";
import {
  insertCategoryAttributeSchema,
  insertCategoryAttributeOptionSchema,
  insertProductAttributeSchema,
  insertProductAttributeOptionSchema,
  insertProductAttributeValueSchema
} from "@shared/schema";

/**
 * Register all category and product attribute-related routes
 */
export default function registerProductAttributeRoutes(app: Express) {
  const handleErrors = (fn: Function) => async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, "Validation error", 400, "VALIDATION_ERROR", error.errors);
      }
      console.error("Error in product attribute route:", error);
      return sendError(res, "Internal server error", 500, "SERVER_ERROR");
    }
  };

  // New endpoint to get filterable attributes for product listings
  app.get("/api/categories/:categoryId/filterable-attributes", handleErrors(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      return sendError(res, "Invalid category ID", 400, "INVALID_ID");
    }
    
    // Get all attributes for this category
    const categoryAttributes = await storage.getCategoryAttributes(categoryId);
    
    // Filter to only include filterable attributes
    const filterableAttributes = [];
    
    for (const catAttr of categoryAttributes) {
      const attribute = await storage.getAttributeById(catAttr.attributeId);
      if (attribute && attribute.isFilterable) {
        // Get the options for this attribute
        const options = await storage.getCategoryAttributeOptions(catAttr.id);
        
        // Only include attributes that have options
        if (options.length > 0) {
          filterableAttributes.push({
            ...catAttr,
            attribute,
            options
          });
        }
      }
    }
    
    sendSuccess(res, filterableAttributes);
  }));

  // Category Attribute Routes
  app.get("/api/categories/:categoryId/attributes", handleErrors(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      return sendError(res, "Invalid category ID", 400, "INVALID_ID");
    }

    const attributes = await storage.getCategoryAttributes(categoryId);
    sendSuccess(res, attributes);
  }));

  app.post("/api/categories/:categoryId/attributes", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      return sendError(res, "Invalid category ID", 400, "INVALID_ID");
    }

    const attributeData = insertCategoryAttributeSchema.parse({
      ...req.body,
      categoryId
    });
    
    const newAttribute = await storage.createCategoryAttribute(attributeData);
    sendSuccess(res, newAttribute, 201);
  }));

  app.put("/api/categories/:categoryId/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const attributeData = insertCategoryAttributeSchema.partial().parse(req.body);
    const updatedAttribute = await storage.updateCategoryAttribute(id, attributeData);
    
    if (!updatedAttribute) {
      return sendError(res, "Category attribute not found", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, updatedAttribute);
  }));

  app.delete("/api/categories/:categoryId/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const success = await storage.deleteCategoryAttribute(id);
    if (!success) {
      return sendError(res, "Category attribute not found or could not be deleted", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, null, 204);
  }));

  // Category Attribute Options Routes
  app.get("/api/categories/:categoryId/attributes/:attributeId/options", handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const options = await storage.getCategoryAttributeOptions(attributeId);
    sendSuccess(res, options);
  }));

  app.post("/api/categories/:categoryId/attributes/:attributeId/options", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const optionData = insertCategoryAttributeOptionSchema.parse({
      ...req.body,
      categoryAttributeId: attributeId
    });
    
    const newOption = await storage.createCategoryAttributeOption(optionData);
    sendSuccess(res, newOption, 201);
  }));

  app.put("/api/categories/:categoryId/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid option ID", 400, "INVALID_ID");
    }

    const optionData = insertCategoryAttributeOptionSchema.partial().parse(req.body);
    const updatedOption = await storage.updateCategoryAttributeOption(id, optionData);
    
    if (!updatedOption) {
      return sendError(res, "Option not found", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, updatedOption);
  }));

  app.delete("/api/categories/:categoryId/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid option ID", 400, "INVALID_ID");
    }

    const success = await storage.deleteCategoryAttributeOption(id);
    if (!success) {
      return sendError(res, "Option not found or could not be deleted", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, null, 204);
  }));

  app.post("/api/categories/:categoryId/attributes/:attributeId/options/reorder", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const { optionIds } = req.body;
    if (!Array.isArray(optionIds)) {
      return sendError(res, "optionIds must be an array of IDs", 400, "INVALID_DATA");
    }

    const success = await storage.updateCategoryAttributeOptionsOrder(attributeId, optionIds);
    if (!success) {
      return sendError(res, "Failed to update options order", 500, "OPERATION_FAILED");
    }
    
    sendSuccess(res, { message: "Options reordered successfully" });
  }));

  // Product Attribute Routes
  app.get("/api/products/:productId/attributes", 
    validateRequest({ 
      params: z.object({ 
        productId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Product ID must be a number" }) 
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const productId = parseInt(req.params.productId);
        
        // Verify that the product exists
        const product = await storage.getProductById(productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${productId} not found`, 'product');
        }
        
        const attributes = await storage.getProductAttributes(productId);
        
        logger.debug(`Retrieved ${attributes.length} attributes for product ID ${productId}`);
        
        sendSuccess(res, attributes);
      } catch (error) {
        logger.error('Error fetching product attributes:', { 
          error, 
          productId: req.params.productId,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  app.post("/api/products/:productId/attributes", 
    isAdmin, 
    validateRequest({ 
      params: z.object({ 
        productId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Product ID must be a number" }) 
      }),
      body: insertProductAttributeSchema.omit({ productId: true })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const productId = parseInt(req.params.productId);
        
        // Verify that the product exists
        const product = await storage.getProductById(productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${productId} not found`, 'product');
        }
        
        // Verify that the attribute exists if attributeId is provided
        if (req.body.attributeId) {
          const attribute = await storage.getAttributeById(req.body.attributeId);
          if (!attribute) {
            throw new NotFoundError(`Attribute with ID ${req.body.attributeId} not found`, 'attribute');
          }
        }
        
        // Check if this attribute is already associated with the product
        if (req.body.attributeId) {
          const existingAttributes = await storage.getProductAttributes(productId);
          const alreadyExists = existingAttributes.some(attr => attr.attributeId === req.body.attributeId);
          
          if (alreadyExists) {
            throw new AppError(
              `Attribute with ID ${req.body.attributeId} is already associated with product ${productId}`,
              ErrorCode.DUPLICATE_ENTITY,
              409
            );
          }
        }
        
        const attributeData = {
          ...req.body,
          productId
        };
        
        const newAttribute = await storage.createProductAttribute(attributeData);
        
        logger.info(`Product attribute created`, {
          productId,
          attributeId: req.body.attributeId,
          productAttributeId: newAttribute.id,
          userId: req.user?.id
        });
        
        sendSuccess(res, newAttribute, 201);
      } catch (error) {
        logger.error('Error creating product attribute:', { 
          error, 
          productId: req.params.productId,
          attributeData: req.body,
          userId: req.user?.id 
        });
        throw error;
      }
    })
  );

  app.put("/api/products/:productId/attributes/:id", 
    isAdmin, 
    validateRequest({ 
      params: z.object({ 
        productId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Product ID must be a number" }),
        id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" }) 
      }),
      body: insertProductAttributeSchema.partial()
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const productId = parseInt(req.params.productId);
        
        // Verify that the product exists
        const product = await storage.getProductById(productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${productId} not found`, 'product');
        }
        
        // Verify that the product attribute exists
        const existingAttribute = await storage.getProductAttributeById(id);
        if (!existingAttribute) {
          throw new NotFoundError(`Product attribute with ID ${id} not found`, 'product_attribute');
        }
        
        // Verify that the attribute belongs to the specified product
        if (existingAttribute.productId !== productId) {
          throw new ForbiddenError(`Product attribute with ID ${id} does not belong to product with ID ${productId}`);
        }
        
        // If attributeId is being updated, verify that the new attribute exists
        if (req.body.attributeId) {
          const attribute = await storage.getAttributeById(req.body.attributeId);
          if (!attribute) {
            throw new NotFoundError(`Attribute with ID ${req.body.attributeId} not found`, 'attribute');
          }
          
          // Check that the new attribute isn't already associated with this product
          if (req.body.attributeId !== existingAttribute.attributeId) {
            const existingAttributes = await storage.getProductAttributes(productId);
            const alreadyExists = existingAttributes.some(attr => 
              attr.id !== id && attr.attributeId === req.body.attributeId
            );
            
            if (alreadyExists) {
              throw new AppError(
                `Attribute with ID ${req.body.attributeId} is already associated with product ${productId}`,
                ErrorCode.DUPLICATE_ENTITY,
                409
              );
            }
          }
        }
        
        const attributeData = req.body;
        const updatedAttribute = await storage.updateProductAttribute(id, attributeData);
        
        logger.info(`Product attribute updated`, {
          productId,
          productAttributeId: id,
          updates: Object.keys(attributeData),
          userId: req.user?.id
        });
        
        sendSuccess(res, updatedAttribute);
      } catch (error) {
        logger.error('Error updating product attribute:', { 
          error, 
          productId: req.params.productId,
          attributeId: req.params.id,
          attributeData: req.body,
          userId: req.user?.id 
        });
        throw error;
      }
    })
  );

  app.delete("/api/products/:productId/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const success = await storage.deleteProductAttribute(id);
    if (!success) {
      return sendError(res, "Product attribute not found or could not be deleted", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, null, 204);
  }));

  // Product Attribute Options Routes
  app.get("/api/products/:productId/attributes/:attributeId/options", handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const options = await storage.getProductAttributeOptions(attributeId);
    sendSuccess(res, options);
  }));

  app.post("/api/products/:productId/attributes/:attributeId/options", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const optionData = insertProductAttributeOptionSchema.parse({
      ...req.body,
      productAttributeId: attributeId
    });
    
    const newOption = await storage.createProductAttributeOption(optionData);
    sendSuccess(res, newOption, 201);
  }));

  app.put("/api/products/:productId/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid option ID", 400, "INVALID_ID");
    }

    const optionData = insertProductAttributeOptionSchema.partial().parse(req.body);
    const updatedOption = await storage.updateProductAttributeOption(id, optionData);
    
    if (!updatedOption) {
      return sendError(res, "Option not found", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, updatedOption);
  }));

  app.delete("/api/products/:productId/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid option ID", 400, "INVALID_ID");
    }

    const success = await storage.deleteProductAttributeOption(id);
    if (!success) {
      return sendError(res, "Option not found or could not be deleted", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, null, 204);
  }));

  app.post("/api/products/:productId/attributes/:attributeId/options/reorder", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const { optionIds } = req.body;
    if (!Array.isArray(optionIds)) {
      return sendError(res, "optionIds must be an array of IDs", 400, "INVALID_REQUEST");
    }

    const success = await storage.updateProductAttributeOptionsOrder(attributeId, optionIds);
    if (!success) {
      return sendError(res, "Failed to update options order", 500, "SERVER_ERROR");
    }
    
    sendSuccess(res, { message: "Options reordered successfully" });
  }));

  // Product Attribute Values Routes
  app.get("/api/products/:productId/attribute-values", handleErrors(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return sendError(res, "Invalid product ID", 400, "INVALID_ID");
    }

    const values = await storage.getProductAttributeValues(productId);
    sendSuccess(res, values);
  }));
  
  // New endpoint to get filterable attributes for product listing when no specific category is selected
  app.get("/api/products/filterable-attributes", handleErrors(async (req: Request, res: Response) => {
    // Get product IDs from query params (optional)
    const productIds = req.query.productIds ? 
      (req.query.productIds as string).split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : 
      [];
    
    // Get all global attributes that are marked as filterable
    const allAttributes = await storage.getAttributes();
    const filterableAttributes = allAttributes.filter(attr => attr.isFilterable);
    
    // For each filterable attribute, collect all unique options used across products
    const result = [];
    
    for (const attribute of filterableAttributes) {
      const attributeWithOptions = {
        ...attribute,
        options: []
      };
      
      // If product IDs are provided, only check options for those products
      if (productIds.length > 0) {
        for (const productId of productIds) {
          // Get product attributes
          const productAttributes = await storage.getProductAttributes(productId);
          const matchingAttribute = productAttributes.find(pa => pa.attributeId === attribute.id);
          
          if (matchingAttribute) {
            // Get options for this product attribute
            const options = await storage.getProductAttributeOptions(matchingAttribute.id);
            
            // Add unique options to the result
            for (const option of options) {
              if (!attributeWithOptions.options.some(o => o.value === option.value)) {
                attributeWithOptions.options.push(option);
              }
            }
          }
        }
      } else {
        // Get all attribute options
        const globalOptions = await storage.getAttributeOptions(attribute.id);
        attributeWithOptions.options = globalOptions;
      }
      
      // Only include attributes that have options
      if (attributeWithOptions.options.length > 0) {
        result.push(attributeWithOptions);
      }
    }
    
    sendSuccess(res, result);
  }));

  app.post("/api/products/:productId/attribute-values", handleErrors(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return sendError(res, "Invalid product ID", 400, "INVALID_ID");
    }

    const valueData = insertProductAttributeValueSchema.parse({
      ...req.body,
      productId
    });
    
    const newValue = await storage.createProductAttributeValue(valueData);
    sendSuccess(res, newValue, 201);
  }));

  app.put("/api/products/:productId/attribute-values/:id", handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid value ID", 400, "INVALID_ID");
    }

    const valueData = insertProductAttributeValueSchema.partial().parse(req.body);
    const updatedValue = await storage.updateProductAttributeValue(id, valueData);
    
    if (!updatedValue) {
      return sendError(res, "Attribute value not found", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, updatedValue);
  }));

  app.delete("/api/products/:productId/attribute-values/:id", handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid value ID", 400, "INVALID_ID");
    }

    const success = await storage.deleteProductAttributeValue(id);
    if (!success) {
      return sendError(res, "Attribute value not found or could not be deleted", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, { message: "Attribute value deleted successfully" }, 200);
  }));
}