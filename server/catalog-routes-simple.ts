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
    
    const { name, description, supplier_id, default_markup_percentage, is_active, cover_image, tags, start_date, end_date } = req.body;
    
    // Validate required fields
    if (!name || !supplier_id) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name and supplier ID are required' }
      });
    }
    
    // Check if catalog name already exists for this supplier
    const exists = await simpleCatalogService.catalogNameExists(name, parseInt(supplier_id));
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
      supplier_id: parseInt(supplier_id),
      default_markup_percentage: default_markup_percentage ? parseInt(default_markup_percentage) : 0,
      is_active: is_active !== false,
      cover_image: cover_image || null,
      tags: tags && Array.isArray(tags) ? tags : null,
      start_date: start_date || null,
      end_date: end_date || null
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