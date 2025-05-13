/**
 * Attribute API Routes for TeeMeYou
 * 
 * This module provides API endpoints for managing product attributes
 * and retrieving attribute definitions for the product wizard.
 */

import { Router, Request, Response, Express } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { sendSuccess, sendError } from './api-response';
import asyncHandler from 'express-async-handler';

const router = Router();

// Get all attributes
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    // In a real application, this would fetch from the database
    // For now, we'll return the mock data
    sendSuccess(res, attributeDefinitions);
  } catch (error) {
    sendError(res, 'Failed to retrieve attributes', 500);
  }
}));

// Schema for attribute creation/update
const attributeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().optional().default('select'),
  options: z.array(
    z.object({
      value: z.string(),
      displayValue: z.string().optional(),
    })
  ).optional(),
  isRequired: z.boolean().optional().default(false),
});

type Attribute = z.infer<typeof attributeSchema>;

// Mock data for attribute definitions
const attributeDefinitions = [
  {
    id: 1,
    name: 'Size',
    type: 'select',
    isRequired: true,
    options: [
      { id: 1, value: 'S', displayValue: 'Small' },
      { id: 2, value: 'M', displayValue: 'Medium' },
      { id: 3, value: 'L', displayValue: 'Large' },
      { id: 4, value: 'XL', displayValue: 'X-Large' },
      { id: 5, value: '2XL', displayValue: '2X-Large' },
    ]
  },
  {
    id: 2,
    name: 'Color',
    type: 'select',
    isRequired: true,
    options: [
      { id: 1, value: 'black', displayValue: 'Black' },
      { id: 2, value: 'white', displayValue: 'White' },
      { id: 3, value: 'red', displayValue: 'Red' },
      { id: 4, value: 'blue', displayValue: 'Blue' },
      { id: 5, value: 'green', displayValue: 'Green' },
    ]
  },
  {
    id: 3,
    name: 'Material',
    type: 'select',
    isRequired: false,
    options: [
      { id: 1, value: 'cotton', displayValue: 'Cotton' },
      { id: 2, value: 'polyester', displayValue: 'Polyester' },
      { id: 3, value: 'blend', displayValue: 'Cotton/Polyester Blend' },
    ]
  }
];

// Get all attribute definitions
router.get('/definitions', asyncHandler(async (req: Request, res: Response) => {
  try {
    // In a real implementation, this would come from the database
    sendSuccess(res, attributeDefinitions);
  } catch (error) {
    sendError(res, 'Failed to retrieve attribute definitions', 500);
  }
}));

// Get available attributes for a product (or all available)
router.get('/available', asyncHandler(async (req: Request, res: Response) => {
  try {
    // This would be customized based on product category in a real implementation
    sendSuccess(res, attributeDefinitions);
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
    
    const attribute = attributeDefinitions.find(attr => attr.id === attributeId);
    
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
    
    const attribute = attributeDefinitions.find(attr => attr.id === attributeId);
    
    if (!attribute) {
      return sendError(res, 'Attribute not found', 404);
    }
    
    // Send back just the options array
    sendSuccess(res, attribute.options || []);
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
    
    const attribute = attributeDefinitions.find(attr => attr.id === attributeId);
    
    if (!attribute) {
      return sendError(res, 'Attribute not found', 404);
    }
    
    const optionSchema = z.object({
      value: z.string().min(1, 'Value is required'),
      displayValue: z.string().optional(),
      metadata: z.record(z.any()).optional(),
      sortOrder: z.number().optional()
    });
    
    const validatedData = optionSchema.parse(req.body);
    
    const newOption = {
      id: (attribute.options?.length || 0) + 1,
      value: validatedData.value,
      displayValue: validatedData.displayValue || validatedData.value,
      metadata: validatedData.metadata || null,
      sortOrder: validatedData.sortOrder || (attribute.options?.length || 0) + 1
    };
    
    if (!attribute.options) {
      attribute.options = [];
    }
    
    attribute.options.push(newOption);
    
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
    
    const attribute = attributeDefinitions.find(attr => attr.id === attributeId);
    
    if (!attribute || !attribute.options) {
      return sendError(res, 'Attribute not found', 404);
    }
    
    const optionIndex = attribute.options.findIndex(opt => opt.id === optionId);
    
    if (optionIndex === -1) {
      return sendError(res, 'Option not found', 404);
    }
    
    const optionSchema = z.object({
      value: z.string().min(1, 'Value is required'),
      displayValue: z.string().optional(),
      metadata: z.record(z.any()).optional(),
      sortOrder: z.number().optional()
    });
    
    const validatedData = optionSchema.parse(req.body);
    
    // Update the option
    attribute.options[optionIndex] = {
      ...attribute.options[optionIndex],
      value: validatedData.value,
      displayValue: validatedData.displayValue || validatedData.value,
      metadata: validatedData.metadata || attribute.options[optionIndex].metadata,
      sortOrder: validatedData.sortOrder || attribute.options[optionIndex].sortOrder
    };
    
    sendSuccess(res, attribute.options[optionIndex]);
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
    
    const attribute = attributeDefinitions.find(attr => attr.id === attributeId);
    
    if (!attribute || !attribute.options) {
      return sendError(res, 'Attribute not found', 404);
    }
    
    const optionIndex = attribute.options.findIndex(opt => opt.id === optionId);
    
    if (optionIndex === -1) {
      return sendError(res, 'Option not found', 404);
    }
    
    // Remove the option
    attribute.options.splice(optionIndex, 1);
    
    sendSuccess(res, { success: true });
  } catch (error) {
    sendError(res, 'Failed to delete attribute option', 500);
  }
}));

// Create a new attribute (would be admin-only in production)
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const validatedData = attributeSchema.parse(req.body);
    
    // In a real implementation, this would be saved to the database
    // and would generate a real ID
    const newAttribute = {
      id: attributeDefinitions.length + 1,
      ...validatedData,
      options: validatedData.options?.map((opt, index) => ({
        id: index + 1,
        value: opt.value,
        displayValue: opt.displayValue || opt.value,
        sortOrder: index + 1
      })) || []
    };
    
    // For demonstration purposes only
    attributeDefinitions.push(newAttribute);
    
    sendSuccess(res, newAttribute, 201);
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
    
    const attributeIndex = attributeDefinitions.findIndex(attr => attr.id === attributeId);
    
    if (attributeIndex === -1) {
      return sendError(res, 'Attribute not found', 404);
    }
    
    const validatedData = attributeSchema.parse(req.body);
    
    // Update the attribute
    attributeDefinitions[attributeIndex] = {
      ...attributeDefinitions[attributeIndex],
      name: validatedData.name,
      type: validatedData.type || attributeDefinitions[attributeIndex].type,
      isRequired: validatedData.isRequired !== undefined ? validatedData.isRequired : attributeDefinitions[attributeIndex].isRequired
    };
    
    sendSuccess(res, attributeDefinitions[attributeIndex]);
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
    
    const attributeIndex = attributeDefinitions.findIndex(attr => attr.id === attributeId);
    
    if (attributeIndex === -1) {
      return sendError(res, 'Attribute not found', 404);
    }
    
    // Remove the attribute
    attributeDefinitions.splice(attributeIndex, 1);
    
    sendSuccess(res, { success: true });
  } catch (error) {
    sendError(res, 'Failed to delete attribute', 500);
  }
}));

// Function to register routes with the app
function registerAttributeRoutes(app: Express) {
  app.use('/api/attributes', router);
}

export default registerAttributeRoutes;