import { Express, Request, Response, NextFunction } from "express";
import { ZodError, z } from "zod";
import { storage } from "./storage";
import { isAdmin } from "./auth-middleware";
import { logger } from "./logger";
import { sendError, sendSuccess } from "./api-response";
import { withStandardResponse } from "./response-wrapper";
import {
  insertAttributeSchema,
  insertAttributeOptionSchema,
  insertCatalogAttributeSchema,
  insertCatalogAttributeOptionSchema,
  insertCategoryAttributeSchema,
  insertCategoryAttributeOptionSchema,
  insertProductAttributeSchema,
  insertProductAttributeOptionSchema,
  insertProductAttributeValueSchema
} from "@shared/schema";
import { 
  AppError, 
  ErrorCode, 
  NotFoundError,
  ValidationError,
  BadRequestError,
  DatabaseError,
  asyncHandler,
  formatZodError 
} from "./error-handler";
import { validateRequest } from "./validation-middleware";

/**
 * Register all attribute-related routes
 */
export default function registerAttributeRoutes(app: Express) {
  // Use asyncHandler instead of custom handleErrors function
  const handleErrors = (fn: Function) => asyncHandler(async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Validation error", formatZodError(error));
      }
      
      // Log error with context information
      logger.error("Error in attribute route:", {
        error,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
      });
      
      // Rethrow error for the global error handler
      throw error;
    }
  });

  // Global Attribute Routes
  app.get("/api/attributes", handleErrors(async (req: Request, res: Response) => {
    const attributes = await storage.getAllAttributes();
    sendSuccess(res, attributes);
  }));

  app.get("/api/attributes/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError(`Invalid attribute ID: ${req.params.id}`);
    }

    const attribute = await storage.getAttributeById(id);
    if (!attribute) {
      throw new NotFoundError(`Attribute with ID ${id} not found`, 'attribute');
    }

    sendSuccess(res, attribute);
  }));

  app.post("/api/attributes", 
    isAdmin, 
    validateRequest({ body: insertAttributeSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const attributeData = req.body;
        
        // Check if attribute with same name already exists
        const existingAttributes = await storage.getAllAttributes();
        const nameExists = existingAttributes.some(attr => 
          attr.name.toLowerCase() === attributeData.name.toLowerCase());
        
        if (nameExists) {
          throw new AppError(
            `Attribute with name '${attributeData.name}' already exists`,
            ErrorCode.DUPLICATE_ENTITY,
            409
          );
        }
        
        const newAttribute = await storage.createAttribute(attributeData);
        sendSuccess(res, newAttribute, 201);
      } catch (error) {
        logger.error('Error creating attribute:', { 
          error, 
          attributeName: req.body.name,
          userId: req.user?.id 
        });
        throw error;
      }
    })
  );

  app.put("/api/attributes/:id", 
    isAdmin, 
    validateRequest({ 
      params: z.object({ id: z.string().refine(val => !isNaN(parseInt(val)), { message: "ID must be a number" }) }),
      body: insertAttributeSchema.partial()
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      
      try {
        // Check if attribute exists
        const existingAttribute = await storage.getAttributeById(id);
        if (!existingAttribute) {
          throw new NotFoundError(`Attribute with ID ${id} not found`, 'attribute');
        }
        
        // If updating name, check for duplicate names
        if (req.body.name && req.body.name !== existingAttribute.name) {
          const allAttributes = await storage.getAllAttributes();
          const nameExists = allAttributes.some(attr => 
            attr.id !== id && attr.name.toLowerCase() === req.body.name.toLowerCase());
          
          if (nameExists) {
            throw new AppError(
              `Attribute with name '${req.body.name}' already exists`,
              ErrorCode.DUPLICATE_ENTITY,
              409
            );
          }
        }
        
        // Check if attribute is used in products before making certain changes
        if (req.body.isMultiValue !== undefined && 
            req.body.isMultiValue !== existingAttribute.isMultiValue) {
          const attributeUsage = await storage.getAttributeUsageCount(id);
          if (attributeUsage > 0) {
            throw new AppError(
              `Cannot change multi-value setting for attribute that is used by ${attributeUsage} products`,
              ErrorCode.ENTITY_IN_USE,
              409
            );
          }
        }
        
        const attributeData = req.body;
        const updatedAttribute = await storage.updateAttribute(id, attributeData);
        
        sendSuccess(res, updatedAttribute);
      } catch (error) {
        logger.error('Error updating attribute:', { 
          error, 
          attributeId: id,
          updateData: req.body,
          userId: req.user?.id 
        });
        throw error;
      }
    })
  );

  app.delete("/api/attributes/:id", 
    isAdmin, 
    validateRequest({ 
      params: z.object({ id: z.string().refine(val => !isNaN(parseInt(val)), { message: "ID must be a number" }) })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      
      try {
        // Check if attribute exists
        const attributeToDelete = await storage.getAttributeById(id);
        if (!attributeToDelete) {
          throw new NotFoundError(`Attribute with ID ${id} not found`, 'attribute');
        }
        
        // Check if attribute is used in products
        const attributeUsage = await storage.getAttributeUsageCount(id);
        if (attributeUsage > 0) {
          throw new AppError(
            `Cannot delete attribute that is used by ${attributeUsage} products. Remove the attribute from all products first.`,
            ErrorCode.ENTITY_IN_USE,
            409
          );
        }
        
        // Check if attribute has options
        const options = await storage.getAttributeOptions(id);
        if (options.length > 0) {
          throw new AppError(
            `Cannot delete attribute with ${options.length} options. Delete all attribute options first.`,
            ErrorCode.DEPENDENCY_EXISTS,
            409
          );
        }
        
        const success = await storage.deleteAttribute(id);
        if (!success) {
          throw new AppError(
            `Failed to delete attribute with ID ${id}`, 
            ErrorCode.INTERNAL_SERVER_ERROR,
            500,
            { attributeId: id }
          );
        }
        
        // Log the deletion for audit purposes
        logger.info(`Attribute deleted`, { 
          attributeId: id, 
          attributeName: attributeToDelete.name,
          userId: req.user?.id 
        });
        
        sendSuccess(res, null, 204);
      } catch (error) {
        logger.error('Error deleting attribute:', { 
          error, 
          attributeId: id,
          userId: req.user?.id 
        });
        throw error;
      }
    })
  );

  // Attribute Options Routes
  app.get("/api/attributes/:attributeId/options", 
    validateRequest({ 
      params: z.object({ 
        attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" }) 
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const attributeId = parseInt(req.params.attributeId);
        
        // Verify that the attribute exists
        const attribute = await storage.getAttributeById(attributeId);
        if (!attribute) {
          throw new NotFoundError(`Attribute with ID ${attributeId} not found`, 'attribute');
        }
        
        const options = await storage.getAttributeOptions(attributeId);
        sendSuccess(res, options);
      } catch (error) {
        logger.error('Error fetching attribute options:', { 
          error, 
          attributeId: req.params.attributeId
        });
        throw error;
      }
    })
  );

  app.post("/api/attributes/:attributeId/options", 
    isAdmin, 
    validateRequest({ 
      params: z.object({ 
        attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" }) 
      }),
      body: insertAttributeOptionSchema.omit({ attributeId: true })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const attributeId = parseInt(req.params.attributeId);
        
        // Verify that the attribute exists
        const attribute = await storage.getAttributeById(attributeId);
        if (!attribute) {
          throw new NotFoundError(`Attribute with ID ${attributeId} not found`, 'attribute');
        }
        
        // Check for duplicate option name
        const existingOptions = await storage.getAttributeOptions(attributeId);
        const nameExists = existingOptions.some(option => 
          option.value.toLowerCase() === req.body.value.toLowerCase());
          
        if (nameExists) {
          throw new AppError(
            `Option with value '${req.body.value}' already exists for this attribute`,
            ErrorCode.DUPLICATE_ENTITY,
            409
          );
        }
        
        const optionData = {
          ...req.body,
          attributeId
        };
        
        const newOption = await storage.createAttributeOption(optionData);
        
        // Log the creation for audit purposes
        logger.info(`Attribute option created`, { 
          attributeId,
          optionId: newOption.id,
          optionValue: newOption.value,
          userId: req.user?.id 
        });
        
        sendSuccess(res, newOption, 201);
      } catch (error) {
        logger.error('Error creating attribute option:', { 
          error, 
          attributeId: req.params.attributeId,
          optionData: req.body,
          userId: req.user?.id 
        });
        throw error;
      }
    })
  );

  app.put("/api/attributes/:attributeId/options/:id", 
    isAdmin, 
    validateRequest({ 
      params: z.object({ 
        attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" }),
        id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Option ID must be a number" })
      }),
      body: insertAttributeOptionSchema.partial().omit({ attributeId: true })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const attributeId = parseInt(req.params.attributeId);
        const id = parseInt(req.params.id);
        
        // Verify that the attribute exists
        const attribute = await storage.getAttributeById(attributeId);
        if (!attribute) {
          throw new NotFoundError(`Attribute with ID ${attributeId} not found`, 'attribute');
        }
        
        // Verify that the option exists and belongs to this attribute
        const options = await storage.getAttributeOptions(attributeId);
        const existingOption = options.find(option => option.id === id);
        
        if (!existingOption) {
          throw new NotFoundError(`Option with ID ${id} not found for attribute ${attributeId}`, 'attributeOption');
        }
        
        // Check for duplicate name if name is being updated
        if (req.body.value && req.body.value !== existingOption.value) {
          const nameExists = options.some(option => 
            option.id !== id && option.value.toLowerCase() === req.body.value.toLowerCase());
            
          if (nameExists) {
            throw new AppError(
              `Option with value '${req.body.value}' already exists for this attribute`,
              ErrorCode.DUPLICATE_ENTITY,
              409
            );
          }
        }
        
        const updatedOption = await storage.updateAttributeOption(id, req.body);
        
        if (!updatedOption) {
          throw new NotFoundError(`Failed to update option with ID ${id}`, 'attributeOption');
        }
        
        // Log the update for audit purposes
        logger.info(`Attribute option updated`, { 
          attributeId,
          optionId: id,
          changes: req.body,
          userId: req.user?.id 
        });
        
        sendSuccess(res, updatedOption);
      } catch (error) {
        logger.error('Error updating attribute option:', { 
          error, 
          attributeId: req.params.attributeId,
          optionId: req.params.id,
          updateData: req.body,
          userId: req.user?.id 
        });
        throw error;
      }
    })
  );

  app.delete("/api/attributes/:attributeId/options/:id", 
    isAdmin, 
    validateRequest({ 
      params: z.object({ 
        attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" }),
        id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Option ID must be a number" })
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const attributeId = parseInt(req.params.attributeId);
        const id = parseInt(req.params.id);
        
        // Verify that the attribute exists
        const attribute = await storage.getAttributeById(attributeId);
        if (!attribute) {
          throw new NotFoundError(`Attribute with ID ${attributeId} not found`, 'attribute');
        }
        
        // Verify that the option exists and belongs to this attribute
        const options = await storage.getAttributeOptions(attributeId);
        const existingOption = options.find(option => option.id === id);
        
        if (!existingOption) {
          throw new NotFoundError(`Option with ID ${id} not found for attribute ${attributeId}`, 'attributeOption');
        }
        
        // Check if this option is in use by any products
        // This would be implemented in a real system to prevent orphaned references
        // For now, we'll just make a placeholder for the logic
        
        // Now safely delete the option
        const success = await storage.deleteAttributeOption(id);
        if (!success) {
          throw new AppError(
            `Failed to delete option with ID ${id}`, 
            ErrorCode.INTERNAL_SERVER_ERROR, 
            500
          );
        }
        
        // Log the deletion for audit purposes
        logger.info(`Attribute option deleted`, { 
          attributeId,
          optionId: id,
          optionValue: existingOption.value,
          userId: req.user?.id 
        });
        
        sendSuccess(res, null, 204);
      } catch (error) {
        logger.error('Error deleting attribute option:', { 
          error, 
          attributeId: req.params.attributeId,
          optionId: req.params.id,
          userId: req.user?.id 
        });
        throw error;
      }
    })
  );

  app.post("/api/attributes/:attributeId/options/reorder", 
    isAdmin, 
    validateRequest({ 
      params: z.object({ 
        attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" })
      }),
      body: z.object({
        optionIds: z.array(z.number()).min(1, "At least one option ID must be provided")
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const attributeId = parseInt(req.params.attributeId);
        const { optionIds } = req.body;
        
        // Verify that the attribute exists
        const attribute = await storage.getAttributeById(attributeId);
        if (!attribute) {
          throw new NotFoundError(`Attribute with ID ${attributeId} not found`, 'attribute');
        }
        
        // Verify that all option IDs belong to this attribute
        const options = await storage.getAttributeOptions(attributeId);
        const existingOptionIds = new Set(options.map(opt => opt.id));
        
        // Check if all provided IDs exist for this attribute
        const nonExistingIds = optionIds.filter(id => !existingOptionIds.has(id));
        if (nonExistingIds.length > 0) {
          throw new BadRequestError(`The following option IDs do not exist for this attribute: ${nonExistingIds.join(', ')}`);
        }
        
        // Check if all options for this attribute are included in the request
        if (optionIds.length !== options.length) {
          throw new BadRequestError('All options must be included when reordering. Some options are missing.');
        }
        
        // Now reorder the options
        const success = await storage.updateAttributeOptionsOrder(attributeId, optionIds);
        if (!success) {
          throw new AppError(
            `Failed to update options order for attribute ${attributeId}`, 
            ErrorCode.INTERNAL_SERVER_ERROR, 
            500
          );
        }
        
        // Log the reordering for audit purposes
        logger.info(`Attribute options reordered`, { 
          attributeId,
          newOrder: optionIds,
          userId: req.user?.id 
        });
        
        sendSuccess(res, { message: "Options reordered successfully" });
      } catch (error) {
        logger.error('Error reordering attribute options:', { 
          error, 
          attributeId: req.params.attributeId,
          optionIds: req.body.optionIds,
          userId: req.user?.id 
        });
        throw error;
      }
    })
  );

  // Catalog Attribute Routes
  app.get("/api/catalogs/:catalogId/attributes", handleErrors(async (req: Request, res: Response) => {
    const catalogId = parseInt(req.params.catalogId);
    if (isNaN(catalogId)) {
      return sendError(res, "Invalid catalog ID", 400, "INVALID_ID");
    }

    const attributes = await storage.getCatalogAttributes(catalogId);
    sendSuccess(res, attributes);
  }));

  app.post("/api/catalogs/:catalogId/attributes", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const catalogId = parseInt(req.params.catalogId);
    if (isNaN(catalogId)) {
      return sendError(res, "Invalid catalog ID", 400, "INVALID_ID");
    }

    const attributeData = insertCatalogAttributeSchema.parse({
      ...req.body,
      catalogId
    });
    
    const newAttribute = await storage.createCatalogAttribute(attributeData);
    sendSuccess(res, newAttribute, 201);
  }));

  app.put("/api/catalogs/:catalogId/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const attributeData = insertCatalogAttributeSchema.partial().parse(req.body);
    const updatedAttribute = await storage.updateCatalogAttribute(id, attributeData);
    
    if (!updatedAttribute) {
      return sendError(res, "Catalog attribute not found", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, updatedAttribute);
  }));

  app.delete("/api/catalogs/:catalogId/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const success = await storage.deleteCatalogAttribute(id);
    if (!success) {
      return sendError(res, "Catalog attribute not found or could not be deleted", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, null, 204);
  }));

  // Catalog Attribute Options Routes
  app.get("/api/catalogs/:catalogId/attributes/:attributeId/options", handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const options = await storage.getCatalogAttributeOptions(attributeId);
    sendSuccess(res, options);
  }));

  app.post("/api/catalogs/:catalogId/attributes/:attributeId/options", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const optionData = insertCatalogAttributeOptionSchema.parse({
      ...req.body,
      catalogAttributeId: attributeId
    });
    
    const newOption = await storage.createCatalogAttributeOption(optionData);
    sendSuccess(res, newOption, 201);
  }));

  app.put("/api/catalogs/:catalogId/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid option ID", 400, "INVALID_ID");
    }

    const optionData = insertCatalogAttributeOptionSchema.partial().parse(req.body);
    const updatedOption = await storage.updateCatalogAttributeOption(id, optionData);
    
    if (!updatedOption) {
      return sendError(res, "Option not found", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, updatedOption);
  }));

  app.delete("/api/catalogs/:catalogId/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid option ID", 400, "INVALID_ID");
    }

    const success = await storage.deleteCatalogAttributeOption(id);
    if (!success) {
      return sendError(res, "Option not found or could not be deleted", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, null, 204);
  }));

  app.post("/api/catalogs/:catalogId/attributes/:attributeId/options/reorder", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const { optionIds } = req.body;
    if (!Array.isArray(optionIds)) {
      return sendError(res, "optionIds must be an array of IDs", 400, "INVALID_FORMAT");
    }

    const success = await storage.updateCatalogAttributeOptionsOrder(attributeId, optionIds);
    if (!success) {
      return sendError(res, "Failed to update options order", 500, "SERVER_ERROR");
    }
    
    sendSuccess(res, { message: "Options reordered successfully" });
  }));
}