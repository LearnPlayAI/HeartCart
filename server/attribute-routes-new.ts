/**
 * Raw SQL Attribute API Routes for TeeMeYou
 * 
 * This module provides API endpoints for managing product attributes
 * using raw SQL instead of Drizzle ORM to avoid camelCase/snake_case conflicts.
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
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const attributes = await attributeService.getAllAttributes();
    sendSuccess(res, attributes);
  } catch (error) {
    console.error('Error fetching attributes:', error);
    sendError(res, 'Failed to retrieve attributes', 500);
  }
}));

// Schema for attribute creation/update
const attributeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  display_name: z.string().min(1, 'Display name is required'),
  description: z.string().optional().nullable(),
  attribute_type: z.string().default('select'),
  is_required: z.boolean().optional().default(false),
  is_filterable: z.boolean().optional().default(false),
  is_comparable: z.boolean().optional().default(false),
  is_swatch: z.boolean().optional().default(false),
  display_in_product_summary: z.boolean().optional().default(false),
  sort_order: z.number().optional().default(0),
  options: z.array(
    z.object({
      value: z.string(),
      display_value: z.string().optional(),
      sort_order: z.number().optional(),
      metadata: z.record(z.any()).optional().nullable(),
    })
  ).optional(),
});

// Get all attribute definitions
router.get('/definitions', asyncHandler(async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const attributes = await attributeService.getAllAttributes();
    sendSuccess(res, attributes);
  } catch (error) {
    console.error('Error fetching attribute definitions:', error);
    sendError(res, 'Failed to retrieve attribute definitions', 500);
  }
}));

// Get available attributes for a product or category
router.get('/available', asyncHandler(async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // For now, return all global attributes (category-specific attributes can be added later)
    const attributes = await attributeService.getAllAttributes();
    sendSuccess(res, attributes);
  } catch (error) {
    console.error('Error fetching available attributes:', error);
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
    
    const attribute = await attributeService.getAttributeById(attributeId);
    
    if (!attribute) {
      return sendError(res, 'Attribute not found', 404);
    }
    
    sendSuccess(res, attribute);
  } catch (error) {
    console.error(`Error fetching attribute ${req.params.id}:`, error);
    sendError(res, 'Failed to retrieve attribute', 500);
  }
}));

// Create a new attribute
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const validatedData = attributeSchema.parse(req.body);
    
    const newAttribute = await attributeService.createAttribute({
      name: validatedData.name,
      display_name: validatedData.display_name,
      description: validatedData.description,
      attribute_type: validatedData.attribute_type,
      is_required: validatedData.is_required,
      is_filterable: validatedData.is_filterable,
      is_comparable: validatedData.is_comparable,
      is_swatch: validatedData.is_swatch,
      display_in_product_summary: validatedData.display_in_product_summary,
      sort_order: validatedData.sort_order,
    });
    
    // Create options if provided
    if (validatedData.options && validatedData.options.length > 0) {
      for (const option of validatedData.options) {
        await attributeService.createAttributeOption({
          attribute_id: newAttribute.id,
          value: option.value,
          display_value: option.display_value || option.value,
          metadata: option.metadata,
          sort_order: option.sort_order || 0,
        });
      }
    }
    
    sendSuccess(res, newAttribute, 'Attribute created successfully', 201);
  } catch (error: any) {
    console.error('Error creating attribute:', error);
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid attribute data: ' + error.message, 400);
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
    
    const validatedData = attributeSchema.partial().parse(req.body);
    
    const updatedAttribute = await attributeService.updateAttribute(attributeId, {
      name: validatedData.name,
      display_name: validatedData.display_name,
      description: validatedData.description,
      attribute_type: validatedData.attribute_type,
      is_required: validatedData.is_required,
      is_filterable: validatedData.is_filterable,
      is_comparable: validatedData.is_comparable,
      is_swatch: validatedData.is_swatch,
      display_in_product_summary: validatedData.display_in_product_summary,
      sort_order: validatedData.sort_order,
    });
    
    if (!updatedAttribute) {
      return sendError(res, 'Attribute not found', 404);
    }
    
    sendSuccess(res, updatedAttribute, 'Attribute updated successfully');
  } catch (error: any) {
    console.error(`Error updating attribute ${req.params.id}:`, error);
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid attribute data: ' + error.message, 400);
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
    
    const success = await attributeService.deleteAttribute(attributeId);
    
    if (success) {
      sendSuccess(res, null, 'Attribute deleted successfully');
    } else {
      sendError(res, 'Attribute not found', 404);
    }
  } catch (error) {
    console.error(`Error deleting attribute ${req.params.id}:`, error);
    sendError(res, 'Failed to delete attribute', 500);
  }
}));

// Get attribute options
router.get('/:id/options', asyncHandler(async (req: Request, res: Response) => {
  try {
    const attributeId = parseInt(req.params.id);
    
    if (isNaN(attributeId)) {
      return sendError(res, 'Invalid attribute ID', 400);
    }
    
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const options = await attributeService.getAttributeOptions(attributeId);
    sendSuccess(res, options);
  } catch (error) {
    console.error(`Error fetching options for attribute ${req.params.id}:`, error);
    sendError(res, 'Failed to retrieve attribute options', 500);
  }
}));

// Create attribute option
router.post('/:id/options', asyncHandler(async (req: Request, res: Response) => {
  try {
    const attributeId = parseInt(req.params.id);
    
    if (isNaN(attributeId)) {
      return sendError(res, 'Invalid attribute ID', 400);
    }
    
    const { value, display_value, metadata, sort_order } = req.body;
    
    if (!value) {
      return sendError(res, 'Option value is required', 400);
    }
    
    const newOption = await attributeService.createAttributeOption({
      attribute_id: attributeId,
      value,
      display_value: display_value || value,
      metadata,
      sort_order: sort_order || 0,
    });
    
    sendSuccess(res, newOption, 'Option created successfully', 201);
  } catch (error) {
    console.error(`Error creating option for attribute ${req.params.id}:`, error);
    sendError(res, 'Failed to create attribute option', 500);
  }
}));

// Update attribute option
router.put('/:id/options/:optionId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const optionId = parseInt(req.params.optionId);
    
    if (isNaN(optionId)) {
      return sendError(res, 'Invalid option ID', 400);
    }
    
    const { value, display_value, metadata, sort_order } = req.body;
    
    const updatedOption = await attributeService.updateAttributeOption(optionId, {
      value,
      display_value,
      metadata,
      sort_order,
    });
    
    if (!updatedOption) {
      return sendError(res, 'Option not found', 404);
    }
    
    sendSuccess(res, updatedOption, 'Option updated successfully');
  } catch (error) {
    console.error(`Error updating option ${req.params.optionId}:`, error);
    sendError(res, 'Failed to update attribute option', 500);
  }
}));

// Delete attribute option
router.delete('/:id/options/:optionId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const optionId = parseInt(req.params.optionId);
    
    if (isNaN(optionId)) {
      return sendError(res, 'Invalid option ID', 400);
    }
    
    const success = await attributeService.deleteAttributeOption(optionId);
    
    if (success) {
      sendSuccess(res, null, 'Option deleted successfully');
    } else {
      sendError(res, 'Option not found', 404);
    }
  } catch (error) {
    console.error(`Error deleting option ${req.params.optionId}:`, error);
    sendError(res, 'Failed to delete attribute option', 500);
  }
}));

// Get all available attribute types
router.get('/types', asyncHandler(async (req: Request, res: Response) => {
  try {
    const attributeTypes = [
      "text",       // Simple text values
      "number",     // Numeric values
      "boolean",    // True/false values
      "color",      // Color values with hex codes
      "size",       // Size values
      "date",       // Date values
      "select"      // Select from predefined options
    ];
    
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    sendSuccess(res, attributeTypes);
  } catch (error) {
    console.error('Error fetching attribute types:', error);
    sendError(res, 'Failed to retrieve attribute types', 500);
  }
}));

// Get all attributes with their options
router.get('/all-options', asyncHandler(async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const attributesWithOptions = await attributeService.getAttributesWithOptions();
    sendSuccess(res, attributesWithOptions);
  } catch (error) {
    console.error('Error fetching all attributes with options:', error);
    sendError(res, 'Failed to retrieve all attributes with options', 500);
  }
}));

// Function to register routes with the app
function registerAttributeRoutes(app: Express) {
  app.use('/api/attributes', router);
}

export default registerAttributeRoutes;