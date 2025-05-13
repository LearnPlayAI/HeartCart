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
        displayValue: opt.displayValue || opt.value
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

// Function to register routes with the app
function registerAttributeRoutes(app: Express) {
  app.use('/api/attributes', router);
}

export default registerAttributeRoutes;