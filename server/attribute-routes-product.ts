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
  ValidationError,
  BadRequestError,
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
  // Use asyncHandler instead of custom handleErrors function
  const handleErrors = (fn: Function) => asyncHandler(async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Validation error", error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })));
      }
      
      // Log error with context information
      logger.error("Error in product attribute route:", {
        error,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
      });
      
      // Rethrow error for the global error handler
      throw error;
    }
  });

  // New endpoint to get filterable attributes for product listings
  app.get("/api/categories/:categoryId/filterable-attributes", 
    validateRequest({
      params: z.object({
        categoryId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Category ID must be a number" })
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const categoryId = parseInt(req.params.categoryId);
        
        // Verify that the category exists
        const category = await storage.getCategoryById(categoryId);
        if (!category) {
          throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
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
        
        logger.debug(`Retrieved ${filterableAttributes.length} filterable attributes for category ID ${categoryId}`);
        
        sendSuccess(res, filterableAttributes);
      } catch (error) {
        logger.error('Error fetching filterable attributes for category:', { 
          error, 
          categoryId: req.params.categoryId,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  // Category Attribute Routes
  app.get("/api/categories/:categoryId/attributes", 
    validateRequest({
      params: z.object({
        categoryId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Category ID must be a number" })
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const categoryId = parseInt(req.params.categoryId);
        
        // Verify that the category exists
        const category = await storage.getCategoryById(categoryId);
        if (!category) {
          throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
        }
        
        const attributes = await storage.getCategoryAttributes(categoryId);
        
        logger.debug(`Retrieved ${attributes.length} attributes for category ID ${categoryId}`);
        
        sendSuccess(res, attributes);
      } catch (error) {
        logger.error('Error fetching category attributes:', { 
          error, 
          categoryId: req.params.categoryId,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  app.post("/api/categories/:categoryId/attributes", 
    isAdmin,
    validateRequest({
      params: z.object({
        categoryId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Category ID must be a number" })
      }),
      body: insertCategoryAttributeSchema.omit({ categoryId: true })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const categoryId = parseInt(req.params.categoryId);
        
        // Verify that the category exists
        const category = await storage.getCategoryById(categoryId);
        if (!category) {
          throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
        }
        
        // Verify that the attribute exists if attributeId is provided
        if (req.body.attributeId) {
          const attribute = await storage.getAttributeById(req.body.attributeId);
          if (!attribute) {
            throw new NotFoundError(`Attribute with ID ${req.body.attributeId} not found`, 'attribute');
          }
        }
        
        // Check if this attribute is already associated with the category
        if (req.body.attributeId) {
          const existingAttributes = await storage.getCategoryAttributes(categoryId);
          const alreadyExists = existingAttributes.some(attr => attr.attributeId === req.body.attributeId);
          
          if (alreadyExists) {
            throw new AppError(
              `Attribute with ID ${req.body.attributeId} is already associated with category ${categoryId}`,
              ErrorCode.DUPLICATE_ENTITY,
              409
            );
          }
        }
        
        const attributeData = {
          ...req.body,
          categoryId
        };
        
        const newAttribute = await storage.createCategoryAttribute(attributeData);
        
        logger.info(`Category attribute created`, {
          categoryId,
          attributeId: req.body.attributeId,
          categoryAttributeId: newAttribute.id,
          userId: req.user?.id
        });
        
        sendSuccess(res, newAttribute, 201);
      } catch (error) {
        logger.error('Error creating category attribute:', { 
          error, 
          categoryId: req.params.categoryId,
          attributeData: req.body,
          userId: req.user?.id 
        });
        throw error;
      }
    })
  );

  app.put("/api/categories/:categoryId/attributes/:id", 
    isAdmin,
    validateRequest({
      params: z.object({
        categoryId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Category ID must be a number" }),
        id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" })
      }),
      body: insertCategoryAttributeSchema.partial()
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const categoryId = parseInt(req.params.categoryId);
        
        // Verify that the category exists
        const category = await storage.getCategoryById(categoryId);
        if (!category) {
          throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
        }
        
        // Verify that the category attribute exists
        const existingAttribute = await storage.getCategoryAttributeById(id);
        if (!existingAttribute) {
          throw new NotFoundError(`Category attribute with ID ${id} not found`, 'category_attribute');
        }
        
        // Verify that the attribute belongs to the specified category
        if (existingAttribute.categoryId !== categoryId) {
          throw new ForbiddenError(`Category attribute with ID ${id} does not belong to category with ID ${categoryId}`);
        }
        
        // If attributeId is being updated, verify that the new attribute exists
        if (req.body.attributeId) {
          const attribute = await storage.getAttributeById(req.body.attributeId);
          if (!attribute) {
            throw new NotFoundError(`Attribute with ID ${req.body.attributeId} not found`, 'attribute');
          }
          
          // Check that the new attribute isn't already associated with this category
          if (req.body.attributeId !== existingAttribute.attributeId) {
            const existingAttributes = await storage.getCategoryAttributes(categoryId);
            const alreadyExists = existingAttributes.some(attr => 
              attr.id !== id && attr.attributeId === req.body.attributeId
            );
            
            if (alreadyExists) {
              throw new AppError(
                `Attribute with ID ${req.body.attributeId} is already associated with category ${categoryId}`,
                ErrorCode.DUPLICATE_ENTITY,
                409
              );
            }
          }
        }
        
        const attributeData = req.body;
        const updatedAttribute = await storage.updateCategoryAttribute(id, attributeData);
        
        if (!updatedAttribute) {
          throw new AppError(
            `Failed to update category attribute with ID ${id}`,
            ErrorCode.OPERATION_FAILED,
            500
          );
        }
        
        logger.info(`Category attribute updated`, {
          categoryId,
          categoryAttributeId: id,
          changes: req.body,
          userId: req.user?.id
        });
        
        sendSuccess(res, updatedAttribute);
      } catch (error) {
        logger.error('Error updating category attribute:', { 
          error, 
          categoryId: req.params.categoryId,
          attributeId: req.params.id,
          body: req.body,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  app.delete("/api/categories/:categoryId/attributes/:id", 
    isAdmin,
    validateRequest({
      params: z.object({
        categoryId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Category ID must be a number" }),
        id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" })
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const categoryId = parseInt(req.params.categoryId);
        
        // Verify that the category exists
        const category = await storage.getCategoryById(categoryId);
        if (!category) {
          throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
        }
        
        // Verify that the category attribute exists
        const existingAttribute = await storage.getCategoryAttributeById(id);
        if (!existingAttribute) {
          throw new NotFoundError(`Category attribute with ID ${id} not found`, 'category_attribute');
        }
        
        // Verify that the attribute belongs to the specified category
        if (existingAttribute.categoryId !== categoryId) {
          throw new ForbiddenError(`Category attribute with ID ${id} does not belong to category with ID ${categoryId}`);
        }
        
        // Check for dependent resources (options, values, etc.)
        const options = await storage.getCategoryAttributeOptions(id);
        if (options.length > 0) {
          // We could automatically delete the options, but here we'll require manual deletion first
          throw new AppError(
            `Cannot delete category attribute with ID ${id} because it has ${options.length} options. Delete them first.`,
            ErrorCode.DEPENDENT_RESOURCES_EXIST,
            409
          );
        }
        
        const success = await storage.deleteCategoryAttribute(id);
        if (!success) {
          throw new AppError(
            `Failed to delete category attribute with ID ${id}`,
            ErrorCode.OPERATION_FAILED,
            500
          );
        }
        
        logger.info(`Category attribute deleted`, {
          categoryId,
          categoryAttributeId: id,
          userId: req.user?.id
        });
        
        sendSuccess(res, null, 204);
      } catch (error) {
        logger.error('Error deleting category attribute:', { 
          error, 
          categoryId: req.params.categoryId,
          attributeId: req.params.id,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  // Category Attribute Options Routes
  app.get("/api/categories/:categoryId/attributes/:attributeId/options", 
    validateRequest({
      params: z.object({
        categoryId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Category ID must be a number" }),
        attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" })
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const attributeId = parseInt(req.params.attributeId);
        const categoryId = parseInt(req.params.categoryId);
        
        // Verify that the category exists
        const category = await storage.getCategoryById(categoryId);
        if (!category) {
          throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
        }
        
        // Verify that the category attribute exists
        const categoryAttribute = await storage.getCategoryAttributeById(attributeId);
        if (!categoryAttribute) {
          throw new NotFoundError(`Category attribute with ID ${attributeId} not found`, 'category_attribute');
        }
        
        // Verify that the attribute belongs to the specified category
        if (categoryAttribute.categoryId !== categoryId) {
          throw new ForbiddenError(`Category attribute with ID ${attributeId} does not belong to category with ID ${categoryId}`);
        }
        
        const options = await storage.getCategoryAttributeOptions(attributeId);
        
        logger.debug(`Retrieved ${options.length} options for category attribute ID ${attributeId}`, {
          categoryId,
          attributeId
        });
        
        sendSuccess(res, options);
      } catch (error) {
        logger.error('Error fetching category attribute options:', { 
          error, 
          categoryId: req.params.categoryId,
          attributeId: req.params.attributeId,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  app.post("/api/categories/:categoryId/attributes/:attributeId/options", 
    isAdmin,
    validateRequest({
      params: z.object({
        categoryId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Category ID must be a number" }),
        attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" })
      }),
      body: insertCategoryAttributeOptionSchema.omit({ categoryAttributeId: true })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const attributeId = parseInt(req.params.attributeId);
        const categoryId = parseInt(req.params.categoryId);
        
        // Verify that the category exists
        const category = await storage.getCategoryById(categoryId);
        if (!category) {
          throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
        }
        
        // Verify that the category attribute exists
        const categoryAttribute = await storage.getCategoryAttributeById(attributeId);
        if (!categoryAttribute) {
          throw new NotFoundError(`Category attribute with ID ${attributeId} not found`, 'category_attribute');
        }
        
        // Verify that the attribute belongs to the specified category
        if (categoryAttribute.categoryId !== categoryId) {
          throw new ForbiddenError(`Category attribute with ID ${attributeId} does not belong to category with ID ${categoryId}`);
        }
        
        // Validate option data
        // Check if an option with the same value already exists
        if (req.body.value) {
          const existingOptions = await storage.getCategoryAttributeOptions(attributeId);
          const duplicateOption = existingOptions.find(option => 
            option.value.toLowerCase() === req.body.value.toLowerCase()
          );
          
          if (duplicateOption) {
            throw new AppError(
              `An option with value "${req.body.value}" already exists for this attribute`,
              ErrorCode.DUPLICATE_ENTITY,
              409
            );
          }
        }
        
        const optionData = {
          ...req.body,
          categoryAttributeId: attributeId
        };
        
        const newOption = await storage.createCategoryAttributeOption(optionData);
        
        logger.info(`Category attribute option created`, {
          categoryId,
          attributeId,
          optionId: newOption.id,
          value: newOption.value,
          userId: req.user?.id
        });
        
        sendSuccess(res, newOption, 201);
      } catch (error) {
        logger.error('Error creating category attribute option:', { 
          error, 
          categoryId: req.params.categoryId,
          attributeId: req.params.attributeId,
          optionData: req.body,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  app.put("/api/categories/:categoryId/attributes/:attributeId/options/:id", 
    isAdmin, 
    validateRequest({
      params: z.object({
        categoryId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Category ID must be a number" }),
        attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" }),
        id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Option ID must be a number" })
      }),
      body: insertCategoryAttributeOptionSchema.partial()
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const attributeId = parseInt(req.params.attributeId);
        const categoryId = parseInt(req.params.categoryId);
        
        // Verify that the category exists
        const category = await storage.getCategoryById(categoryId);
        if (!category) {
          throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
        }
        
        // Verify that the category attribute exists
        const categoryAttribute = await storage.getCategoryAttributeById(attributeId);
        if (!categoryAttribute) {
          throw new NotFoundError(`Category attribute with ID ${attributeId} not found`, 'category_attribute');
        }
        
        // Verify that the attribute belongs to the specified category
        if (categoryAttribute.categoryId !== categoryId) {
          throw new ForbiddenError(`Category attribute with ID ${attributeId} does not belong to category with ID ${categoryId}`);
        }
        
        // Verify that the option exists
        const existingOption = await storage.getCategoryAttributeOptionById(id);
        if (!existingOption) {
          throw new NotFoundError(`Option with ID ${id} not found`, 'attribute_option');
        }
        
        // Verify that the option belongs to the specified attribute
        if (existingOption.categoryAttributeId !== attributeId) {
          throw new ForbiddenError(`Option with ID ${id} does not belong to attribute with ID ${attributeId}`);
        }
        
        // If updating value, check for duplication
        if (req.body.value) {
          const existingOptions = await storage.getCategoryAttributeOptions(attributeId);
          const duplicateOption = existingOptions.find(option => 
            option.id !== id && 
            option.value.toLowerCase() === req.body.value.toLowerCase()
          );
          
          if (duplicateOption) {
            throw new AppError(
              `An option with value "${req.body.value}" already exists for this attribute`,
              ErrorCode.DUPLICATE_ENTITY,
              409
            );
          }
        }
        
        const optionData = req.body;
        const updatedOption = await storage.updateCategoryAttributeOption(id, optionData);
        
        if (!updatedOption) {
          throw new AppError(
            `Failed to update option with ID ${id}`,
            ErrorCode.OPERATION_FAILED,
            500
          );
        }
        
        logger.info(`Category attribute option updated`, {
          categoryId,
          attributeId,
          optionId: id,
          updates: Object.keys(optionData),
          userId: req.user?.id
        });
        
        sendSuccess(res, updatedOption);
      } catch (error) {
        logger.error('Error updating category attribute option:', { 
          error, 
          categoryId: req.params.categoryId,
          attributeId: req.params.attributeId,
          optionId: req.params.id,
          optionData: req.body,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  app.delete("/api/categories/:categoryId/attributes/:attributeId/options/:id", 
    isAdmin,
    validateRequest({
      params: z.object({
        categoryId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Category ID must be a number" }),
        attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" }),
        id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Option ID must be a number" })
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const attributeId = parseInt(req.params.attributeId);
        const categoryId = parseInt(req.params.categoryId);
        
        // Verify that the category exists
        const category = await storage.getCategoryById(categoryId);
        if (!category) {
          throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
        }
        
        // Verify that the category attribute exists
        const categoryAttribute = await storage.getCategoryAttributeById(attributeId);
        if (!categoryAttribute) {
          throw new NotFoundError(`Category attribute with ID ${attributeId} not found`, 'category_attribute');
        }
        
        // Verify that the attribute belongs to the specified category
        if (categoryAttribute.categoryId !== categoryId) {
          throw new ForbiddenError(`Category attribute with ID ${attributeId} does not belong to category with ID ${categoryId}`);
        }
        
        // Verify that the option exists
        const existingOption = await storage.getCategoryAttributeOptionById(id);
        if (!existingOption) {
          throw new NotFoundError(`Option with ID ${id} not found`, 'attribute_option');
        }
        
        // Verify that the option belongs to the specified attribute
        if (existingOption.categoryAttributeId !== attributeId) {
          throw new ForbiddenError(`Option with ID ${id} does not belong to attribute with ID ${attributeId}`);
        }
        
        // Check if the option is being used in any products
        // This would depend on your data model - here we're assuming there might be product attributes
        // using category attribute options
        try {
          const productAttributes = await storage.getProductAttributeValuesByCategoryOptionId(id);
          if (productAttributes && productAttributes.length > 0) {
            throw new AppError(
              `Cannot delete option with ID ${id} because it is used by ${productAttributes.length} products`,
              ErrorCode.ENTITY_IN_USE,
              409
            );
          }
        } catch (err) {
          // If the method doesn't exist, we can ignore this check
          logger.warn(`Could not check product attribute values for category option ID ${id}`, { error: err });
        }
        
        const success = await storage.deleteCategoryAttributeOption(id);
        if (!success) {
          throw new AppError(
            `Failed to delete option with ID ${id}`,
            ErrorCode.OPERATION_FAILED,
            500
          );
        }
        
        logger.info(`Category attribute option deleted`, {
          categoryId,
          attributeId,
          optionId: id,
          userId: req.user?.id
        });
        
        sendSuccess(res, null, 204);
      } catch (error) {
        logger.error('Error deleting category attribute option:', { 
          error, 
          categoryId: req.params.categoryId,
          attributeId: req.params.attributeId,
          optionId: req.params.id,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  app.post("/api/categories/:categoryId/attributes/:attributeId/options/reorder", 
    isAdmin,
    validateRequest({
      params: z.object({
        categoryId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Category ID must be a number" }),
        attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" })
      }),
      body: z.object({
        optionIds: z.array(z.number())
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const attributeId = parseInt(req.params.attributeId);
        const categoryId = parseInt(req.params.categoryId);
        const { optionIds } = req.body;
        
        // Verify that the category exists
        const category = await storage.getCategoryById(categoryId);
        if (!category) {
          throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
        }
        
        // Verify that the category attribute exists
        const categoryAttribute = await storage.getCategoryAttributeById(attributeId);
        if (!categoryAttribute) {
          throw new NotFoundError(`Category attribute with ID ${attributeId} not found`, 'category_attribute');
        }
        
        // Verify that the attribute belongs to the specified category
        if (categoryAttribute.categoryId !== categoryId) {
          throw new ForbiddenError(`Category attribute with ID ${attributeId} does not belong to category with ID ${categoryId}`);
        }
        
        // Get all options to verify that the provided IDs actually exist
        const existingOptions = await storage.getCategoryAttributeOptions(attributeId);
        const existingIds = new Set(existingOptions.map(option => option.id));
        
        // Check if all optionIds exist
        const nonExistentIds = optionIds.filter(id => !existingIds.has(id));
        if (nonExistentIds.length > 0) {
          throw new BadRequestError(`The following option IDs do not exist for this attribute: ${nonExistentIds.join(', ')}`);
        }
        
        // Check if all existing options are included in the reordering
        const missingIds = [...existingIds].filter(id => !optionIds.includes(id));
        if (missingIds.length > 0) {
          throw new BadRequestError(`Not all existing options are included in the reorder request. Missing IDs: ${missingIds.join(', ')}`);
        }
        
        const success = await storage.updateCategoryAttributeOptionsOrder(attributeId, optionIds);
        if (!success) {
          throw new AppError(
            `Failed to update options order for attribute ID ${attributeId}`,
            ErrorCode.OPERATION_FAILED,
            500
          );
        }
        
        logger.info(`Category attribute options reordered`, {
          categoryId,
          attributeId,
          optionIds,
          userId: req.user?.id
        });
        
        sendSuccess(res, { message: "Options reordered successfully" });
      } catch (error) {
        logger.error('Error reordering category attribute options:', { 
          error, 
          categoryId: req.params.categoryId,
          attributeId: req.params.attributeId,
          optionIds: req.body.optionIds,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

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

  app.delete("/api/products/:productId/attributes/:id", 
    isAdmin, 
    validateRequest({ 
      params: z.object({ 
        productId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Product ID must be a number" }),
        id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" }) 
      })
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
        
        // Check if there are any attribute values or options that depend on this attribute
        const attributeOptions = await storage.getProductAttributeOptions(id);
        if (attributeOptions.length > 0) {
          logger.warn(`Deleting product attribute ${id} with ${attributeOptions.length} options`);
          // Options will be cascade deleted in the database
        }
        
        const success = await storage.deleteProductAttribute(id);
        if (!success) {
          throw new AppError(
            `Failed to delete product attribute with ID ${id}`,
            ErrorCode.OPERATION_FAILED,
            500
          );
        }
        
        logger.info(`Product attribute deleted`, {
          productId,
          attributeId: id,
          userId: req.user?.id
        });
        
        sendSuccess(res, null, 204);
      } catch (error) {
        logger.error('Error deleting product attribute:', { 
          error, 
          productId: req.params.productId,
          attributeId: req.params.id,
          userId: req.user?.id 
        });
        throw error;
      }
    })
  );

  // Product Attribute Options Routes
  app.get("/api/products/:productId/attributes/:attributeId/options", 
    validateRequest({ 
      params: z.object({ 
        productId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Product ID must be a number" }),
        attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" }) 
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const attributeId = parseInt(req.params.attributeId);
        const productId = parseInt(req.params.productId);
        
        // Verify that the product exists
        const product = await storage.getProductById(productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${productId} not found`, 'product');
        }
        
        // Verify that the product attribute exists
        const productAttribute = await storage.getProductAttributeById(attributeId);
        if (!productAttribute) {
          throw new NotFoundError(`Product attribute with ID ${attributeId} not found`, 'product_attribute');
        }
        
        // Verify that the attribute belongs to the specified product
        if (productAttribute.productId !== productId) {
          throw new ForbiddenError(`Product attribute with ID ${attributeId} does not belong to product with ID ${productId}`);
        }
        
        const options = await storage.getProductAttributeOptions(attributeId);
        
        logger.debug(`Retrieved ${options.length} options for product attribute ID ${attributeId}`);
        
        sendSuccess(res, options);
      } catch (error) {
        logger.error('Error fetching product attribute options:', { 
          error, 
          productId: req.params.productId,
          attributeId: req.params.attributeId,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  app.post("/api/products/:productId/attributes/:attributeId/options", 
    isAdmin, 
    validateRequest({ 
      params: z.object({ 
        productId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Product ID must be a number" }),
        attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" }) 
      }),
      body: insertProductAttributeOptionSchema.omit({ productAttributeId: true })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const attributeId = parseInt(req.params.attributeId);
        const productId = parseInt(req.params.productId);
        
        // Verify that the product exists
        const product = await storage.getProductById(productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${productId} not found`, 'product');
        }
        
        // Verify that the product attribute exists
        const productAttribute = await storage.getProductAttributeById(attributeId);
        if (!productAttribute) {
          throw new NotFoundError(`Product attribute with ID ${attributeId} not found`, 'product_attribute');
        }
        
        // Verify that the attribute belongs to the specified product
        if (productAttribute.productId !== productId) {
          throw new ForbiddenError(`Product attribute with ID ${attributeId} does not belong to product with ID ${productId}`);
        }
        
        // Check for duplicate value
        const existingOptions = await storage.getProductAttributeOptions(attributeId);
        const isDuplicate = existingOptions.some(option => 
          option.value.toLowerCase() === req.body.value.toLowerCase()
        );
        
        if (isDuplicate) {
          throw new AppError(
            `Option with value "${req.body.value}" already exists for this attribute`,
            ErrorCode.DUPLICATE_ENTITY,
            409
          );
        }
        
        const optionData = {
          ...req.body,
          productAttributeId: attributeId
        };
        
        const newOption = await storage.createProductAttributeOption(optionData);
        
        logger.info(`Created new product attribute option`, {
          productId,
          attributeId,
          optionId: newOption.id,
          value: newOption.value,
          userId: req.user?.id
        });
        
        sendSuccess(res, newOption, 201);
      } catch (error) {
        logger.error('Error creating product attribute option:', { 
          error, 
          productId: req.params.productId,
          attributeId: req.params.attributeId,
          requestBody: req.body,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  app.put("/api/products/:productId/attributes/:attributeId/options/:id", 
    isAdmin, 
    validateRequest({ 
      params: z.object({ 
        productId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Product ID must be a number" }),
        attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" }),
        id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Option ID must be a number" })
      }),
      body: insertProductAttributeOptionSchema.partial().omit({ productAttributeId: true })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const attributeId = parseInt(req.params.attributeId);
        const productId = parseInt(req.params.productId);
        
        // Verify that the product exists
        const product = await storage.getProductById(productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${productId} not found`, 'product');
        }
        
        // Verify that the product attribute exists
        const productAttribute = await storage.getProductAttributeById(attributeId);
        if (!productAttribute) {
          throw new NotFoundError(`Product attribute with ID ${attributeId} not found`, 'product_attribute');
        }
        
        // Verify that the attribute belongs to the specified product
        if (productAttribute.productId !== productId) {
          throw new ForbiddenError(`Product attribute with ID ${attributeId} does not belong to product with ID ${productId}`);
        }
        
        // Verify that the option exists
        const option = await storage.getProductAttributeOptionById(id);
        if (!option) {
          throw new NotFoundError(`Option with ID ${id} not found`, 'product_attribute_option');
        }
        
        // Verify that the option belongs to the specified attribute
        if (option.productAttributeId !== attributeId) {
          throw new ForbiddenError(`Option with ID ${id} does not belong to attribute with ID ${attributeId}`);
        }
        
        // Check for duplicate value if we're updating the value
        if (req.body.value) {
          const existingOptions = await storage.getProductAttributeOptions(attributeId);
          const isDuplicate = existingOptions.some(existingOption => 
            existingOption.id !== id && 
            existingOption.value.toLowerCase() === req.body.value.toLowerCase()
          );
          
          if (isDuplicate) {
            throw new AppError(
              `Option with value "${req.body.value}" already exists for this attribute`,
              ErrorCode.DUPLICATE_ENTITY,
              409
            );
          }
        }
        
        // Update the option
        const optionData = req.body;
        const updatedOption = await storage.updateProductAttributeOption(id, optionData);
        
        if (!updatedOption) {
          throw new AppError(
            `Failed to update option with ID ${id}`,
            ErrorCode.OPERATION_FAILED,
            500
          );
        }
        
        logger.info(`Updated product attribute option`, {
          productId,
          attributeId,
          optionId: id,
          updates: Object.keys(optionData),
          userId: req.user?.id
        });
        
        sendSuccess(res, updatedOption);
      } catch (error) {
        logger.error('Error updating product attribute option:', { 
          error, 
          productId: req.params.productId,
          attributeId: req.params.attributeId,
          optionId: req.params.id,
          requestBody: req.body,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  app.delete("/api/products/:productId/attributes/:attributeId/options/:id", 
    isAdmin, 
    validateRequest({ 
      params: z.object({ 
        productId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Product ID must be a number" }),
        attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" }),
        id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Option ID must be a number" })
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const attributeId = parseInt(req.params.attributeId);
        const productId = parseInt(req.params.productId);
        
        // Verify that the product exists
        const product = await storage.getProductById(productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${productId} not found`, 'product');
        }
        
        // Verify that the product attribute exists
        const productAttribute = await storage.getProductAttributeById(attributeId);
        if (!productAttribute) {
          throw new NotFoundError(`Product attribute with ID ${attributeId} not found`, 'product_attribute');
        }
        
        // Verify that the attribute belongs to the specified product
        if (productAttribute.productId !== productId) {
          throw new ForbiddenError(`Product attribute with ID ${attributeId} does not belong to product with ID ${productId}`);
        }
        
        // Verify that the option exists
        const option = await storage.getProductAttributeOptionById(id);
        if (!option) {
          throw new NotFoundError(`Option with ID ${id} not found`, 'product_attribute_option');
        }
        
        // Verify that the option belongs to the specified attribute
        if (option.productAttributeId !== attributeId) {
          throw new ForbiddenError(`Option with ID ${id} does not belong to attribute with ID ${attributeId}`);
        }
        
        // Check if any attribute values reference this option
        const attributeValues = await storage.getProductAttributeValuesByOptionId(id);
        if (attributeValues.length > 0) {
          logger.warn(`Deleting option ${id} that is referenced by ${attributeValues.length} attribute values`);
          // These will be cascade deleted in the database but it would be good to know
        }
        
        const success = await storage.deleteProductAttributeOption(id);
        if (!success) {
          throw new AppError(
            `Failed to delete option with ID ${id}`,
            ErrorCode.OPERATION_FAILED,
            500
          );
        }
        
        logger.info(`Deleted product attribute option`, {
          productId,
          attributeId,
          optionId: id,
          userId: req.user?.id
        });
        
        sendSuccess(res, null, 204);
      } catch (error) {
        logger.error('Error deleting product attribute option:', { 
          error, 
          productId: req.params.productId,
          attributeId: req.params.attributeId,
          optionId: req.params.id,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  app.post("/api/products/:productId/attributes/:attributeId/options/reorder", 
    isAdmin, 
    validateRequest({ 
      params: z.object({ 
        productId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Product ID must be a number" }),
        attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" })
      }),
      body: z.object({
        optionIds: z.array(z.number())
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const attributeId = parseInt(req.params.attributeId);
        const productId = parseInt(req.params.productId);
        const { optionIds } = req.body;
        
        // Verify that the product exists
        const product = await storage.getProductById(productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${productId} not found`, 'product');
        }
        
        // Verify that the product attribute exists
        const productAttribute = await storage.getProductAttributeById(attributeId);
        if (!productAttribute) {
          throw new NotFoundError(`Product attribute with ID ${attributeId} not found`, 'product_attribute');
        }
        
        // Verify that the attribute belongs to the specified product
        if (productAttribute.productId !== productId) {
          throw new ForbiddenError(`Product attribute with ID ${attributeId} does not belong to product with ID ${productId}`);
        }
        
        // Verify that all option IDs exist and belong to this attribute
        const existingOptions = await storage.getProductAttributeOptions(attributeId);
        const existingOptionIds = new Set(existingOptions.map(option => option.id));
        
        // Ensure all provided IDs exist in the database
        const invalidIds = optionIds.filter(id => !existingOptionIds.has(id));
        if (invalidIds.length > 0) {
          throw new NotFoundError(
            `The following option IDs do not exist for this attribute: ${invalidIds.join(', ')}`,
            'product_attribute_option'
          );
        }
        
        // Ensure all existing options are included in the reorder request
        if (optionIds.length !== existingOptions.length) {
          const missingIds = [...existingOptionIds].filter(id => !optionIds.includes(id));
          throw new ValidationError(
            `Reorder request is missing the following option IDs: ${missingIds.join(', ')}`,
            'optionIds'
          );
        }
        
        const success = await storage.updateProductAttributeOptionsOrder(attributeId, optionIds);
        if (!success) {
          throw new AppError(
            `Failed to update options order for attribute ID ${attributeId}`,
            ErrorCode.OPERATION_FAILED,
            500
          );
        }
        
        logger.info(`Reordered product attribute options`, {
          productId,
          attributeId,
          optionIds,
          userId: req.user?.id
        });
        
        sendSuccess(res, { message: "Options reordered successfully" });
      } catch (error) {
        logger.error('Error reordering product attribute options:', { 
          error, 
          productId: req.params.productId,
          attributeId: req.params.attributeId,
          optionIds: req.body?.optionIds,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  // Product Attribute Values Routes
  app.get("/api/products/:productId/attribute-values", 
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
        
        const values = await storage.getProductAttributeValues(productId);
        
        logger.debug(`Retrieved ${values.length} attribute values for product ID ${productId}`);
        
        sendSuccess(res, values);
      } catch (error) {
        logger.error('Error fetching product attribute values:', { 
          error, 
          productId: req.params.productId,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );
  
  // New endpoint to get filterable attributes for product listing when no specific category is selected
  app.get("/api/products/filterable-attributes", 
    validateRequest({
      query: z.object({
        productIds: z.string().optional()
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        // Get product IDs from query params (optional)
        const productIds = req.query.productIds ? 
          (req.query.productIds as string).split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : 
          [];
        
        // Get all global attributes that are marked as filterable
        const allAttributes = await storage.getAllAttributes();
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
                  if (!attributeWithOptions.options.some(existingOption => existingOption.value === option.value)) {
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
        
        logger.debug(`Retrieved ${result.length} filterable attributes with options`);
        
        sendSuccess(res, result);
      } catch (error) {
        logger.error('Error fetching filterable attributes:', { 
          error, 
          productIds: req.query.productIds || 'none',
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  app.post("/api/products/:productId/attribute-values", 
    isAdmin,
    validateRequest({
      params: z.object({
        productId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Product ID must be a number" })
      }),
      body: insertProductAttributeValueSchema.omit({ productId: true })
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
        
        // If productAttributeId is provided, verify it exists and is associated with this product
        if (req.body.productAttributeId) {
          const productAttribute = await storage.getProductAttributeById(req.body.productAttributeId);
          if (!productAttribute) {
            throw new NotFoundError(`Product attribute with ID ${req.body.productAttributeId} not found`, 'product_attribute');
          }
          
          if (productAttribute.productId !== productId) {
            throw new ForbiddenError(`Product attribute with ID ${req.body.productAttributeId} does not belong to product with ID ${productId}`);
          }
        }
        
        // If productAttributeOptionId is provided, verify it exists
        if (req.body.productAttributeOptionId) {
          const option = await storage.getProductAttributeOptionById(req.body.productAttributeOptionId);
          if (!option) {
            throw new NotFoundError(`Product attribute option with ID ${req.body.productAttributeOptionId} not found`, 'product_attribute_option');
          }
          
          // Check if the option belongs to the specified product attribute
          if (req.body.productAttributeId) {
            const productAttributeOptions = await storage.getProductAttributeOptions(req.body.productAttributeId);
            const optionExists = productAttributeOptions.some(o => o.id === req.body.productAttributeOptionId);
            if (!optionExists) {
              throw new BadRequestError(`Option with ID ${req.body.productAttributeOptionId} does not belong to product attribute with ID ${req.body.productAttributeId}`);
            }
          }
        }
        
        const valueData = {
          ...req.body,
          productId
        };
        
        const newValue = await storage.createProductAttributeValue(valueData);
        
        logger.info(`Created product attribute value for product ID ${productId}`, {
          productId,
          valueId: newValue.id,
          userId: req.user?.id
        });
        
        sendSuccess(res, newValue, 201);
      } catch (error) {
        logger.error('Error creating product attribute value:', { 
          error, 
          productId: req.params.productId,
          body: req.body,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  app.put("/api/products/:productId/attribute-values/:id", 
    isAdmin,
    validateRequest({
      params: z.object({
        productId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Product ID must be a number" }),
        id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Value ID must be a number" })
      }),
      body: insertProductAttributeValueSchema.partial().omit({ productId: true })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const productId = parseInt(req.params.productId);
        const id = parseInt(req.params.id);
        
        // Verify that the product exists
        const product = await storage.getProductById(productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${productId} not found`, 'product');
        }
        
        // Verify that the attribute value exists and belongs to this product
        const attributeValue = await storage.getProductAttributeValueById(id);
        if (!attributeValue) {
          throw new NotFoundError(`Attribute value with ID ${id} not found`, 'product_attribute_value');
        }
        
        if (attributeValue.productId !== productId) {
          throw new ForbiddenError(`Attribute value with ID ${id} does not belong to product with ID ${productId}`);
        }
        
        // Validate related entities if present in the update data
        if (req.body.attributeId) {
          const attribute = await storage.getAttributeById(req.body.attributeId);
          if (!attribute) {
            throw new NotFoundError(`Attribute with ID ${req.body.attributeId} not found`, 'attribute');
          }
        }
        
        if (req.body.productAttributeId) {
          const productAttribute = await storage.getProductAttributeById(req.body.productAttributeId);
          if (!productAttribute) {
            throw new NotFoundError(`Product attribute with ID ${req.body.productAttributeId} not found`, 'product_attribute');
          }
          
          if (productAttribute.productId !== productId) {
            throw new ForbiddenError(`Product attribute with ID ${req.body.productAttributeId} does not belong to product with ID ${productId}`);
          }
        }
        
        if (req.body.productAttributeOptionId) {
          const option = await storage.getProductAttributeOptionById(req.body.productAttributeOptionId);
          if (!option) {
            throw new NotFoundError(`Product attribute option with ID ${req.body.productAttributeOptionId} not found`, 'product_attribute_option');
          }
        }
        
        const valueData = {
          ...req.body,
          productId // Ensure productId remains the same
        };
        
        const updatedValue = await storage.updateProductAttributeValue(id, valueData);
        if (!updatedValue) {
          throw new AppError(
            `Failed to update attribute value with ID ${id}`,
            ErrorCode.OPERATION_FAILED,
            500
          );
        }
        
        logger.info(`Updated product attribute value with ID ${id}`, {
          productId,
          valueId: id,
          changes: req.body,
          userId: req.user?.id
        });
        
        sendSuccess(res, updatedValue);
      } catch (error) {
        logger.error('Error updating product attribute value:', { 
          error, 
          productId: req.params.productId,
          valueId: req.params.id,
          body: req.body,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );

  app.delete("/api/products/:productId/attribute-values/:id", 
    isAdmin,
    validateRequest({
      params: z.object({
        productId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Product ID must be a number" }),
        id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Value ID must be a number" })
      })
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
        
        // Verify that the attribute value exists and belongs to this product
        const attributeValue = await storage.getProductAttributeValueById(id);
        if (!attributeValue) {
          throw new NotFoundError(`Attribute value with ID ${id} not found`, 'product_attribute_value');
        }
        
        if (attributeValue.productId !== productId) {
          throw new ForbiddenError(`Attribute value with ID ${id} does not belong to product with ID ${productId}`);
        }
        
        // Check for products that may be using this attribute value for pricing
        // This check would depend on your specific schema and relationships
        
        const success = await storage.deleteProductAttributeValue(id);
        if (!success) {
          throw new AppError(
            `Failed to delete attribute value with ID ${id}`,
            ErrorCode.OPERATION_FAILED,
            500
          );
        }
        
        logger.info(`Product attribute value deleted`, {
          productId,
          valueId: id,
          userId: req.user?.id
        });
        
        sendSuccess(res, { message: "Attribute value deleted successfully" });
      } catch (error) {
        logger.error('Error deleting product attribute value:', { 
          error, 
          productId: req.params.productId,
          valueId: req.params.id,
          userId: req.user?.id
        });
        throw error;
      }
    })
  );
}