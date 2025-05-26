/**
 * Raw SQL Catalog API Routes for TeeMeYou
 * 
 * This module provides API endpoints for managing catalogs
 * using raw SQL instead of Drizzle ORM to avoid camelCase/snake_case conflicts.
 */

import { Router, Request, Response, Express } from 'express';
import { z } from 'zod';
import { sendSuccess, sendError } from './api-response';
import asyncHandler from 'express-async-handler';
import { catalogService } from './catalog-service';
import { isAuthenticated, isAdmin } from './auth-middleware';

const router = Router();

// Schema for catalog creation/update
const catalogSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  supplier_id: z.number().min(1, 'Supplier is required'),
  default_markup_percentage: z.number().optional().default(0),
  is_active: z.boolean().optional().default(true),
  cover_image: z.string().url().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
});

// Get all catalogs
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { activeOnly, supplierId, q } = req.query;
    
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const activeOnlyFlag = activeOnly === 'true';
    const supplierIdNum = supplierId ? parseInt(supplierId as string) : undefined;
    
    let catalogs = await catalogService.getAllCatalogs(activeOnlyFlag, supplierIdNum);
    
    // Apply search filter if provided
    if (q && typeof q === 'string' && q.trim()) {
      const searchTerm = q.trim().toLowerCase();
      catalogs = catalogs.filter(catalog => 
        catalog.name.toLowerCase().includes(searchTerm) ||
        (catalog.description && catalog.description.toLowerCase().includes(searchTerm)) ||
        (catalog.supplier_name && catalog.supplier_name.toLowerCase().includes(searchTerm))
      );
    }
    
    sendSuccess(res, catalogs, undefined, 200, {
      count: catalogs.length,
      total: catalogs.length
    });
  } catch (error) {
    console.error('Error fetching catalogs:', error);
    sendError(res, 'Failed to retrieve catalogs', 500);
  }
}));

// Get a specific catalog by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const catalogId = parseInt(req.params.id);
    
    if (isNaN(catalogId)) {
      return sendError(res, 'Invalid catalog ID', 400);
    }
    
    const catalog = await catalogService.getCatalogById(catalogId);
    
    if (!catalog) {
      return sendError(res, 'Catalog not found', 404);
    }
    
    sendSuccess(res, catalog);
  } catch (error) {
    console.error(`Error fetching catalog ${req.params.id}:`, error);
    sendError(res, 'Failed to retrieve catalog', 500);
  }
}));

// Create a new catalog (no authentication required)
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('=== CATALOG CREATION DEBUG ===');
    console.log('Raw request body:', req.body);
    
    const validatedData = catalogSchema.parse(req.body);
    console.log('Validated data:', validatedData);
    
    // Check if catalog name already exists for this supplier
    const nameExists = await catalogService.catalogNameExists(
      validatedData.name,
      validatedData.supplier_id
    );
    
    if (nameExists) {
      return sendError(res, 'A catalog with this name already exists for this supplier', 400);
    }
    
    const newCatalog = await catalogService.createCatalog({
      name: validatedData.name,
      description: validatedData.description,
      supplier_id: validatedData.supplier_id,
      default_markup_percentage: validatedData.default_markup_percentage || 0,
      is_active: validatedData.is_active,
      cover_image: validatedData.cover_image,
      tags: validatedData.tags,
      start_date: validatedData.start_date,
      end_date: validatedData.end_date,
    });
    
    sendSuccess(res, newCatalog, 'Catalog created successfully', 201);
  } catch (error: any) {
    console.error('Error creating catalog:', error);
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid catalog data: ' + error.message, 400);
    }
    sendError(res, 'Failed to create catalog', 500);
  }
}));

// Update a catalog (admin only)
router.put('/:id', isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const catalogId = parseInt(req.params.id);
    
    if (isNaN(catalogId)) {
      return sendError(res, 'Invalid catalog ID', 400);
    }
    
    const validatedData = catalogSchema.partial().parse(req.body);
    
    // Check if catalog name already exists for this supplier (excluding current catalog)
    if (validatedData.name && validatedData.supplier_id) {
      const nameExists = await catalogService.catalogNameExists(
        validatedData.name,
        validatedData.supplier_id,
        catalogId
      );
      
      if (nameExists) {
        return sendError(res, 'A catalog with this name already exists for this supplier', 400);
      }
    }
    
    const updatedCatalog = await catalogService.updateCatalog(catalogId, {
      name: validatedData.name,
      description: validatedData.description,
      supplier_id: validatedData.supplier_id,
      is_active: validatedData.is_active,
      image_url: validatedData.image_url,
    });
    
    if (!updatedCatalog) {
      return sendError(res, 'Catalog not found', 404);
    }
    
    sendSuccess(res, updatedCatalog, 'Catalog updated successfully');
  } catch (error: any) {
    console.error(`Error updating catalog ${req.params.id}:`, error);
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid catalog data: ' + error.message, 400);
    }
    sendError(res, 'Failed to update catalog', 500);
  }
}));

// Delete a catalog (admin only)
router.delete('/:id', isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const catalogId = parseInt(req.params.id);
    
    if (isNaN(catalogId)) {
      return sendError(res, 'Invalid catalog ID', 400);
    }
    
    const success = await catalogService.deleteCatalog(catalogId);
    
    if (success) {
      sendSuccess(res, null, 'Catalog deleted successfully');
    } else {
      sendError(res, 'Catalog not found', 404);
    }
  } catch (error) {
    console.error(`Error deleting catalog ${req.params.id}:`, error);
    sendError(res, 'Failed to delete catalog', 500);
  }
}));

// Get catalogs by supplier
router.get('/supplier/:supplierId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const supplierId = parseInt(req.params.supplierId);
    
    if (isNaN(supplierId)) {
      return sendError(res, 'Invalid supplier ID', 400);
    }
    
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const catalogs = await catalogService.getCatalogsBySupplier(supplierId);
    
    sendSuccess(res, catalogs, undefined, 200, {
      count: catalogs.length,
      total: catalogs.length
    });
  } catch (error) {
    console.error(`Error fetching catalogs for supplier ${req.params.supplierId}:`, error);
    sendError(res, 'Failed to retrieve catalogs for supplier', 500);
  }
}));

// Function to register routes with the app
function registerCatalogRoutes(app: Express) {
  app.use('/api/catalogs', router);
}

export default registerCatalogRoutes;