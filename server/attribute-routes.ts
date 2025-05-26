/**
 * Attribute API Routes for TeeMeYou
 * 
 * This module provides API endpoints for managing product attributes
 * and retrieving attribute definitions for the product wizard.
 */

import { Router, Request, Response, Express } from 'express';
import { z } from 'zod';
import { sendSuccess, sendError } from './api-response';
import asyncHandler from 'express-async-handler';
import { attributeService } from './attribute-service';

const router = Router();

// Get all attributes
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Add cache control headers to ensure clients always get fresh data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const attributes = await storage.getAllAttributes();
    sendSuccess(res, attributes);
  } catch (error) {
    sendError(res, 'Failed to retrieve attributes', 500);
  }
}));

// Schema for attribute creation/update
const attributeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  displayName: z.string().min(1, 'Display name is required'),
  description: z.string().optional().nullable(),
  attributeType: z.string().default('select'),
  isRequired: z.boolean().optional().default(false),
  isFilterable: z.boolean().optional().default(false),
  isComparable: z.boolean().optional().default(false),
  isSwatch: z.boolean().optional().default(false),
  displayInProductSummary: z.boolean().optional().default(false),
  sortOrder: z.number().optional().default(0),
  options: z.array(
    z.object({
      value: z.string(),
      displayValue: z.string().optional(),
      sortOrder: z.number().optional(),
      metadata: z.record(z.any()).optional().nullable(),
    })
  ).optional(),
});

// Get all attribute definitions
router.get('/definitions', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Add cache control headers to ensure clients always get fresh data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const attributes = await storage.getAllAttributes();
    sendSuccess(res, attributes);
  } catch (error) {
    sendError(res, 'Failed to retrieve attribute definitions', 500);
  }
}));

// Get available attributes for a product or category
router.get('/available', asyncHandler(async (req: Request, res: Response) => {
  try {
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    
    // Add cache control headers to ensure clients always get fresh data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    if (categoryId) {
      // If category ID is provided, get attributes for that category
      const categoryAttributes = await storage.getCategoryAttributes(categoryId);
      sendSuccess(res, categoryAttributes);
    } else {
      // Otherwise return all global attributes
      const attributes = await storage.getAllAttributes();
      sendSuccess(res, attributes);
    }
  } catch (error) {
    sendError(res, 'Failed to retrieve available attributes', 500);
  }
}));

// Get a specific attribute by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const attributeId = parseInt(req.params.id);
    
    if (isNaN(attributeId)) {
      return sendError(res, 'Invalid attribute ID', 400);
    }
    
    // Add cache control headers to ensure clients always get fresh attribute data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const attribute = await storage.getAttributeById(attributeId);
    
    if (!attribute) {
      return sendError(res, 'Attribute not found', 404);
    }
    
    sendSuccess(res, attribute);
  } catch (error) {
    sendError(res, 'Failed to retrieve attribute', 500);
  }
}));

// Get options for a specific attribute
router.get('/:id/options', asyncHandler(async (req: Request, res: Response) => {
  try {
    const attributeId = parseInt(req.params.id);
    
    if (isNaN(attributeId)) {
      return sendError(res, 'Invalid attribute ID', 400);
    }
    
    // Add cache control headers to ensure clients always get fresh attribute options
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const options = await storage.getAttributeOptions(attributeId);
    
    if (!options) {
      return sendError(res, 'Attribute not found or has no options', 404);
    }
    
    sendSuccess(res, options);
  } catch (error) {
    sendError(res, 'Failed to retrieve attribute options', 500);
  }
}));

// Create a new option for an attribute
router.post('/:id/options', asyncHandler(async (req: Request, res: Response) => {
  try {
    const attributeId = parseInt(req.params.id);
    
    if (isNaN(attributeId)) {
      return sendError(res, 'Invalid attribute ID', 400);
    }
    
    const attribute = await storage.getAttributeById(attributeId);
    
    if (!attribute) {
      return sendError(res, 'Attribute not found', 404);
    }
    
    const optionSchema = z.object({
      value: z.string().min(1, 'Value is required'),
      displayValue: z.string().optional(),
      metadata: z.record(z.any()).optional().nullable(),
      sortOrder: z.number().optional()
    });
    
    const validatedData = optionSchema.parse(req.body);
    
    const newOptionData = {
      attributeId,
      value: validatedData.value,
      displayValue: validatedData.displayValue || validatedData.value,
      metadata: validatedData.metadata || null,
      sortOrder: validatedData.sortOrder || 0
    };
    
    const newOption = await storage.createAttributeOption(newOptionData);
    
    sendSuccess(res, newOption, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Validation error', 400, error.format());
    }
    sendError(res, 'Failed to create attribute option', 500);
  }
}));

// Update an option for an attribute
router.put('/:attributeId/options/:optionId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const attributeId = parseInt(req.params.attributeId);
    const optionId = parseInt(req.params.optionId);
    
    if (isNaN(attributeId) || isNaN(optionId)) {
      return sendError(res, 'Invalid ID', 400);
    }
    
    // Check if attribute exists
    const attribute = await storage.getAttributeById(attributeId);
    
    if (!attribute) {
      return sendError(res, 'Attribute not found', 404);
    }
    
    // Check if option exists
    const option = await storage.getAttributeOptionById(optionId);
    
    if (!option || option.attributeId !== attributeId) {
      return sendError(res, 'Option not found', 404);
    }
    
    const optionSchema = z.object({
      value: z.string().min(1, 'Value is required'),
      displayValue: z.string().optional(),
      metadata: z.record(z.any()).optional().nullable(),
      sortOrder: z.number().optional()
    });
    
    const validatedData = optionSchema.parse(req.body);
    
    // Update the option
    const updatedOption = await storage.updateAttributeOption(optionId, {
      value: validatedData.value,
      displayValue: validatedData.displayValue || validatedData.value,
      metadata: validatedData.metadata,
      sortOrder: validatedData.sortOrder
    });
    
    sendSuccess(res, updatedOption);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Validation error', 400, error.format());
    }
    sendError(res, 'Failed to update attribute option', 500);
  }
}));

// Delete an option from an attribute
router.delete('/:attributeId/options/:optionId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const attributeId = parseInt(req.params.attributeId);
    const optionId = parseInt(req.params.optionId);
    
    if (isNaN(attributeId) || isNaN(optionId)) {
      return sendError(res, 'Invalid ID', 400);
    }
    
    // Check if attribute exists
    const attribute = await storage.getAttributeById(attributeId);
    
    if (!attribute) {
      return sendError(res, 'Attribute not found', 404);
    }
    
    // Check if option exists
    const option = await storage.getAttributeOptionById(optionId);
    
    if (!option || option.attributeId !== attributeId) {
      return sendError(res, 'Option not found', 404);
    }
    
    // Delete the option
    const deleted = await storage.deleteAttributeOption(optionId);
    
    if (!deleted) {
      return sendError(res, 'Failed to delete attribute option', 500);
    }
    
    // Add cache control headers to ensure clients don't cache the response
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    sendSuccess(res, { success: true });
  } catch (error) {
    sendError(res, 'Failed to delete attribute option', 500);
  }
}));

// Create a new attribute (would be admin-only in production)
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const validatedData = attributeSchema.parse(req.body);
    
    // Create the attribute in the database
    const attributeToCreate = {
      name: validatedData.name,
      displayName: validatedData.displayName,
      description: validatedData.description,
      attributeType: validatedData.attributeType,
      isRequired: validatedData.isRequired,
      isFilterable: validatedData.isFilterable,
      isComparable: validatedData.isComparable,
      isSwatch: validatedData.isSwatch,
      displayInProductSummary: validatedData.displayInProductSummary,
      sortOrder: validatedData.sortOrder || 0,
      validationRules: validatedData.options ? { options: validatedData.options } : null
    };
    
    const newAttribute = await storage.createAttribute(attributeToCreate);
    
    // If options were provided, create them as well
    if (validatedData.options && validatedData.options.length > 0) {
      for (let i = 0; i < validatedData.options.length; i++) {
        const option = validatedData.options[i];
        await storage.createAttributeOption({
          attributeId: newAttribute.id,
          value: option.value,
          displayValue: option.displayValue || option.value,
          sortOrder: option.sortOrder || i + 1,
          metadata: option.metadata || null
        });
      }
      
      // Fetch the attribute with options
      const attributeWithOptions = await storage.getAttributeById(newAttribute.id);
      const options = await storage.getAttributeOptions(newAttribute.id);
      
      sendSuccess(res, { ...attributeWithOptions, options }, 201);
    } else {
      sendSuccess(res, newAttribute, 201);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Validation error', 400, error.format());
    }
    sendError(res, 'Failed to create attribute', 500);
  }
}));

// Update an attribute
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const attributeId = parseInt(req.params.id);
    
    if (isNaN(attributeId)) {
      return sendError(res, 'Invalid attribute ID', 400);
    }
    
    const attribute = await storage.getAttributeById(attributeId);
    
    if (!attribute) {
      return sendError(res, 'Attribute not found', 404);
    }
    
    const validatedData = attributeSchema.parse(req.body);
    
    // Update the attribute
    const attributeToUpdate = {
      name: validatedData.name,
      displayName: validatedData.displayName,
      description: validatedData.description,
      attributeType: validatedData.attributeType,
      isRequired: validatedData.isRequired,
      isFilterable: validatedData.isFilterable,
      isComparable: validatedData.isComparable,
      isSwatch: validatedData.isSwatch,
      displayInProductSummary: validatedData.displayInProductSummary,
      sortOrder: validatedData.sortOrder
    };
    
    const updatedAttribute = await storage.updateAttribute(attributeId, attributeToUpdate);
    
    sendSuccess(res, updatedAttribute);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Validation error', 400, error.format());
    }
    sendError(res, 'Failed to update attribute', 500);
  }
}));

// Delete an attribute
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const attributeId = parseInt(req.params.id);
    
    if (isNaN(attributeId)) {
      return sendError(res, 'Invalid attribute ID', 400);
    }
    
    const attribute = await storage.getAttributeById(attributeId);
    
    if (!attribute) {
      return sendError(res, 'Attribute not found', 404);
    }
    
    // Delete the attribute
    const deleted = await storage.deleteAttribute(attributeId);
    
    if (!deleted) {
      return sendError(res, 'Failed to delete attribute', 500);
    }
    
    // Add cache control headers to ensure clients don't cache the response
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    sendSuccess(res, { success: true });
  } catch (error) {
    sendError(res, 'Failed to delete attribute', 500);
  }
}));

// Function to register routes with the app
// Get all available attribute types
router.get('/types', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Define the supported attribute types
    const attributeTypes = [
      "text",       // Simple text values (e.g., Material: "Cotton", "Polyester")
      "number",     // Numeric values (e.g., Weight: 5, 10)
      "boolean",    // True/false values
      "color",      // Color values, typically with associated hex codes
      "size",       // Size values (e.g., "S", "M", "L")
      "date",       // Date values
      "select"      // Select from predefined options
    ];
    
    // Add cache control headers to ensure clients always get fresh data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    sendSuccess(res, attributeTypes);
  } catch (error) {
    sendError(res, 'Failed to retrieve attribute types', 500);
  }
}));

function registerAttributeRoutes(app: Express) {
  app.use('/api/attributes', router);
  
  // Additional API route for frontend to get all attribute options
  app.get('/api/attributes/all-options', asyncHandler(async (req: Request, res: Response) => {
    try {
      const allAttributes = await storage.getAllAttributes();
      
      const attributesWithOptions = await Promise.all(
        allAttributes.map(async (attr) => {
          const options = await storage.getAttributeOptions(attr.id);
          return {
            ...attr,
            options: options || []
          };
        })
      );
      
      sendSuccess(res, attributesWithOptions);
    } catch (error) {
      sendError(res, 'Failed to retrieve all attributes with options', 500);
    }
  }));
  
  // Additional API route for frontend to get attributes for a product
  app.get('/api/products/:productId/attributes', asyncHandler(async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      
      if (isNaN(productId)) {
        return sendError(res, 'Invalid product ID', 400);
      }
      
      const productAttributes = await storage.getProductAttributes(productId);
      sendSuccess(res, productAttributes);
    } catch (error) {
      sendError(res, 'Failed to retrieve product attributes', 500);
    }
  }));
}

export default registerAttributeRoutes;