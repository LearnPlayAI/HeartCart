/**
 * Simple Catalog Routes for TeeMeYou
 * 
 * These routes use the simplified catalog service with proper database alignment
 */

import express from 'express';
import asyncHandler from 'express-async-handler';
import { simpleCatalogService } from './catalog-service-simple';

const router = express.Router();

// Get all catalogs
router.get('/', asyncHandler(async (req, res) => {
  try {
    const catalogs = await simpleCatalogService.getAllCatalogs();
    
    res.status(200).json({
      success: true,
      data: catalogs
    });
  } catch (error) {
    console.error('Error fetching catalogs:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch catalogs' }
    });
  }
}));

// Create a new catalog
router.post('/', asyncHandler(async (req, res) => {
  try {
    console.log('Creating catalog with data:', req.body);
    
    const { name, description, supplierId, defaultMarkupPercentage, isActive, coverImage, tags, startDate, endDate } = req.body;
    
    // Validate required fields
    if (!name || !supplierId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name and supplier ID are required' }
      });
    }
    
    // Check if catalog name already exists for this supplier
    const exists = await simpleCatalogService.catalogNameExists(name, parseInt(supplierId));
    if (exists) {
      return res.status(400).json({
        success: false,
        error: { message: 'A catalog with this name already exists for this supplier' }
      });
    }
    
    // Prepare catalog data
    const catalogData = {
      name,
      description: description || null,
      supplier_id: parseInt(supplierId),
      default_markup_percentage: defaultMarkupPercentage ? parseInt(defaultMarkupPercentage) : 0,
      is_active: isActive !== false,
      cover_image: coverImage || null,
      tags: tags && Array.isArray(tags) ? tags : null,
      start_date: startDate || null,
      end_date: endDate || null
    };
    
    console.log('Processed catalog data:', catalogData);
    
    const newCatalog = await simpleCatalogService.createCatalog(catalogData);
    
    res.status(201).json({
      success: true,
      data: newCatalog
    });
  } catch (error) {
    console.error('Error creating catalog:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create catalog' }
    });
  }
}));

export default router;