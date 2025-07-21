/**
 * Product Attribute API Routes for HeartCart
 * 
 * This module provides API endpoints for managing product-specific attributes
 * and attribute values assigned to products.
 */

import { Router, Request, Response, Express } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { sendSuccess, sendError } from './api-response';
import asyncHandler from 'express-async-handler';
import { logger } from './logger';

const router = Router();

// Get attributes for a specific product
router.get('/product/:productId/attributes', asyncHandler(async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);
    
    if (isNaN(productId)) {
      return sendError(res, 'Invalid product ID', 400);
    }
    
    // Get the product to check its category
    const product = await storage.getProductById(productId);
    
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }
    
    logger.debug(`Getting attributes for product ${productId} with category ${product.categoryId}`);
    
    // Add cache control headers to ensure clients always get fresh data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Get all product attributes from the database
    const productAttributes = await storage.getProductAttributes(productId);
    
    // Format the response to match the expected structure
    const formattedAttributes = [];
    
    // Group by attribute and collect options
    const attributeGroups = {};
    
    for (const prodAttr of productAttributes) {
      const attributeId = prodAttr.attribute.id;
      
      if (!attributeGroups[attributeId]) {
        attributeGroups[attributeId] = {
          id: prodAttr.attribute.id,
          name: prodAttr.attribute.name,
          displayName: prodAttr.attribute.displayName,
          type: prodAttr.attribute.attributeType,
          isRequired: prodAttr.attribute.isRequired,
          options: [],
          categoryId: product.categoryId,
          sortOrder: prodAttr.attribute.sortOrder || 0
        };
      }
      
      // Get only the selected options for this product attribute
      if (!attributeGroups[attributeId].optionsLoaded) {
        // Parse the selected_options - it can be either a JSON string or already an array
        let selectedOptionIds: number[] = [];
        if (prodAttr.selectedOptions) {
          try {
            // Check if it's already an array
            if (Array.isArray(prodAttr.selectedOptions)) {
              selectedOptionIds = prodAttr.selectedOptions;
            } else {
              // Try to parse as JSON string
              selectedOptionIds = JSON.parse(prodAttr.selectedOptions);
            }
            logger.debug('Parsed selected options for product attribute', { 
              productId, 
              attributeId, 
              selectedOptionIds,
              rawSelectedOptions: prodAttr.selectedOptions 
            });
          } catch (e) {
            logger.error('Failed to parse selected_options for product attribute', { 
              productId, 
              attributeId, 
              selectedOptions: prodAttr.selectedOptions,
              error: e 
            });
          }
        }
        
        // Only show selected options - no fallback to all options
        if (selectedOptionIds.length > 0) {
          // Get all available options for this attribute
          const allOptions = await storage.getAttributeOptions(attributeId);
          
          // Filter to only show selected options
          const selectedOptions = allOptions.filter(opt => selectedOptionIds.includes(opt.id));
          logger.debug('Filtered selected options', { 
            productId, 
            attributeId, 
            totalOptions: allOptions.length,
            selectedCount: selectedOptions.length,
            selectedOptionIds 
          });
          
          attributeGroups[attributeId].options = selectedOptions.map(opt => ({
            id: opt.id,
            value: opt.value,
            displayValue: opt.displayValue || opt.value
          }));
        } else {
          // No selected options found - show empty options array
          logger.debug('No selected options found, showing empty options', { 
            productId, 
            attributeId
          });
          attributeGroups[attributeId].options = [];
        }
        attributeGroups[attributeId].optionsLoaded = true;
      }
    }
    
    // Convert attribute groups to array
    const result = Object.values(attributeGroups);
    
    sendSuccess(res, result);
  } catch (error) {
    logger.error('Failed to retrieve product attributes', { error, path: req.path });
    sendError(res, 'Failed to retrieve product attributes', 500);
  }
}));

// Get attribute values for a specific product
router.get('/product/:productId/attribute-values', asyncHandler(async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);
    
    if (isNaN(productId)) {
      return sendError(res, 'Invalid product ID', 400);
    }
    
    // Get the product
    const product = await storage.getProductById(productId);
    
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }
    
    // Add cache control headers to ensure clients always get fresh data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Get attribute values from the database
    const productAttributeValues = await storage.getProductAttributeValues(productId);
    
    // Format the response
    const formattedAttributeValues = productAttributeValues.map(attrValue => ({
      productId,
      attributeId: attrValue.attributeId,
      attributeOptionId: attrValue.attributeOptionId,
      valueText: attrValue.valueText || null
    }));
    
    sendSuccess(res, formattedAttributeValues);
  } catch (error) {
    logger.error('Failed to retrieve product attribute values', { error, path: req.path });
    sendError(res, 'Failed to retrieve product attribute values', 500);
  }
}));

// Get global attributes for a specific product
router.get('/product/:productId/global-attributes', asyncHandler(async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);
    
    if (isNaN(productId)) {
      return sendError(res, 'Invalid product ID', 400);
    }
    
    // Get the product
    const product = await storage.getProductById(productId);
    
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }
    
    logger.debug(`Getting global attributes for product ${productId}`);
    
    // Add cache control headers to ensure clients always get fresh data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Get all product global attributes from the database
    const productGlobalAttributes = await storage.getProductGlobalAttributes(productId);
    
    if (!productGlobalAttributes || productGlobalAttributes.length === 0) {
      // If no attributes found, return empty array
      return sendSuccess(res, []);
    }
    
    // Format the response to match the expected structure
    const formattedAttributes = productGlobalAttributes.map(attr => ({
      id: attr.id,
      productId: attr.productId,
      attribute: {
        id: attr.attribute.id,
        name: attr.attribute.name,
        displayName: attr.attribute.displayName || attr.attribute.name,
        attributeType: attr.attribute.attributeType,
        isRequired: attr.attribute.isRequired
      },
      options: attr.options || []
    }));
    
    sendSuccess(res, formattedAttributes);
  } catch (error) {
    logger.error('Failed to retrieve product global attributes', { error, path: req.path });
    sendError(res, 'Failed to retrieve product global attributes', 500);
  }
}));

// Function to register routes with the app
function registerProductAttributeRoutes(app: Express) {
  app.use('/api/product-attributes', router);
  
  // Add additional route to support direct endpoint access
  app.get('/api/products/:productId/global-attributes', asyncHandler(async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      
      if (isNaN(productId)) {
        return sendError(res, 'Invalid product ID', 400);
      }
      
      // Get the product
      const product = await storage.getProductById(productId);
      
      if (!product) {
        return sendError(res, 'Product not found', 404);
      }
      
      // Get all product global attributes from the database
      const productGlobalAttributes = await storage.getProductGlobalAttributes(productId);
      
      if (!productGlobalAttributes || productGlobalAttributes.length === 0) {
        // If no attributes found, return empty array
        return sendSuccess(res, []);
      }
      
      // Format the response to match the expected structure
      const formattedAttributes = productGlobalAttributes.map(attr => ({
        id: attr.id,
        productId: attr.productId,
        attribute: {
          id: attr.attribute.id,
          name: attr.attribute.name,
          displayName: attr.attribute.displayName || attr.attribute.name,
          attributeType: attr.attribute.attributeType,
          isRequired: attr.attribute.isRequired
        },
        options: attr.options || []
      }));
      
      sendSuccess(res, formattedAttributes);
    } catch (error) {
      logger.error('Failed to retrieve product global attributes', { error, path: req.path });
      sendError(res, 'Failed to retrieve product global attributes', 500);
    }
  }));

  // Get product attributes (for frontend compatibility)
  app.get('/api/products/:productId/attributes', asyncHandler(async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      
      if (isNaN(productId)) {
        return sendError(res, 'Invalid product ID', 400);
      }
      
      // Get the product to check its category
      const product = await storage.getProductById(productId);
      
      if (!product) {
        return sendError(res, 'Product not found', 404);
      }
      
      logger.debug(`Getting attributes for product ${productId} with category ${product.categoryId}`);
      
      // Add cache control headers to ensure clients always get fresh data
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Get all product attributes from the database
      const productAttributes = await storage.getProductAttributes(productId);
      
      // Format the response to match the expected structure
      const formattedAttributes = [];
      
      // Group by attribute and collect options
      const attributeGroups = {};
      
      for (const prodAttr of productAttributes) {
        const attributeId = prodAttr.attribute.id;
        
        if (!attributeGroups[attributeId]) {
          attributeGroups[attributeId] = {
            id: prodAttr.id, // Use product_attribute ID for frontend operations
            attributeId: prodAttr.attribute.id,
            productId: productId,
            name: prodAttr.attribute.name,
            displayName: prodAttr.attribute.displayName,
            type: prodAttr.attribute.attributeType,
            isRequired: prodAttr.attribute.isRequired,
            selectedOptions: prodAttr.selectedOptions,
            textValue: prodAttr.textValue,
            options: [],
            categoryId: product.categoryId,
            sortOrder: prodAttr.attribute.sortOrder || 0
          };
        }
        
        // Get only the selected options for this product attribute
        if (!attributeGroups[attributeId].optionsLoaded) {
          // Parse the selected_options - it can be either a JSON string or already an array
          let selectedOptionIds: number[] = [];
          if (prodAttr.selectedOptions) {
            try {
              // Check if it's already an array
              if (Array.isArray(prodAttr.selectedOptions)) {
                selectedOptionIds = prodAttr.selectedOptions;
              } else {
                // Try to parse as JSON string
                selectedOptionIds = JSON.parse(prodAttr.selectedOptions);
              }
              logger.debug('Parsed selected options for product attribute', { 
                productId, 
                attributeId, 
                selectedOptionIds,
                rawSelectedOptions: prodAttr.selectedOptions 
              });
            } catch (e) {
              logger.error('Failed to parse selected_options for product attribute', { 
                productId, 
                attributeId, 
                selectedOptions: prodAttr.selectedOptions,
                error: e 
              });
            }
          }
          
          // Only show selected options - no fallback to all options
          if (selectedOptionIds.length > 0) {
            // Get all available options for this attribute
            const allOptions = await storage.getAttributeOptions(attributeId);
            
            // Filter to only show selected options
            const selectedOptions = allOptions.filter(opt => selectedOptionIds.includes(opt.id));
            logger.debug('Filtered selected options', { 
              productId, 
              attributeId, 
              totalOptions: allOptions.length,
              selectedCount: selectedOptions.length,
              selectedOptionIds 
            });
            
            attributeGroups[attributeId].options = selectedOptions.map(opt => ({
              id: opt.id,
              value: opt.value,
              displayValue: opt.displayValue || opt.value
            }));
          } else {
            // No selected options found - show empty options array
            logger.debug('No selected options found, showing empty options', { 
              productId, 
              attributeId
            });
            attributeGroups[attributeId].options = [];
          }
          attributeGroups[attributeId].optionsLoaded = true;
        }
      }
      
      // Convert attribute groups to array
      const result = Object.values(attributeGroups);
      
      sendSuccess(res, result);
    } catch (error) {
      logger.error('Failed to retrieve product attributes', { error, path: req.path });
      sendError(res, 'Failed to retrieve product attributes', 500);
    }
  }));

  // Add product attribute
  app.post('/api/products/:productId/attributes', asyncHandler(async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      
      if (isNaN(productId)) {
        return sendError(res, 'Invalid product ID', 400);
      }
      
      // Validate request body
      const { attributeId, selectedOptions, textValue } = req.body;
      
      if (!attributeId) {
        return sendError(res, 'Attribute ID is required', 400);
      }
      
      // Check if product exists
      const product = await storage.getProductById(productId);
      if (!product) {
        return sendError(res, 'Product not found', 404);
      }
      
      // Check if attribute exists
      const attribute = await storage.getAttributeById(attributeId);
      if (!attribute) {
        return sendError(res, 'Attribute not found', 404);
      }
      
      // Create the product attribute
      const productAttribute = await storage.createProductAttribute({
        productId,
        attributeId,
        selectedOptions: selectedOptions ? JSON.stringify(selectedOptions) : null,
        textValue: textValue || null
      });
      
      logger.info('Created product attribute', { 
        productId, 
        attributeId, 
        selectedOptions,
        textValue,
        productAttributeId: productAttribute.id
      });
      
      sendSuccess(res, productAttribute);
    } catch (error) {
      logger.error('Failed to create product attribute', { error, path: req.path });
      sendError(res, 'Failed to create product attribute', 500);
    }
  }));

  // Update product attribute
  app.put('/api/products/:productId/attributes/:id', asyncHandler(async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      const attributeId = parseInt(req.params.id);
      
      if (isNaN(productId) || isNaN(attributeId)) {
        return sendError(res, 'Invalid product ID or attribute ID', 400);
      }
      
      // Validate request body
      const { selectedOptions, textValue } = req.body;
      
      // Check if product exists
      const product = await storage.getProductById(productId);
      if (!product) {
        return sendError(res, 'Product not found', 404);
      }
      
      // Update the product attribute
      const updatedAttribute = await storage.updateProductAttribute(attributeId, {
        selectedOptions: selectedOptions ? JSON.stringify(selectedOptions) : null,
        textValue: textValue || null
      });
      
      if (!updatedAttribute) {
        return sendError(res, 'Product attribute not found', 404);
      }
      
      logger.info('Updated product attribute', { 
        productId, 
        attributeId, 
        selectedOptions,
        textValue
      });
      
      sendSuccess(res, updatedAttribute);
    } catch (error) {
      logger.error('Failed to update product attribute', { error, path: req.path });
      sendError(res, 'Failed to update product attribute', 500);
    }
  }));

  // Delete product attribute
  app.delete('/api/products/:productId/attributes/:id', asyncHandler(async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      const attributeId = parseInt(req.params.id);
      
      if (isNaN(productId) || isNaN(attributeId)) {
        return sendError(res, 'Invalid product ID or attribute ID', 400);
      }
      
      // Check if product exists
      const product = await storage.getProductById(productId);
      if (!product) {
        return sendError(res, 'Product not found', 404);
      }
      
      // Delete the product attribute
      const deleted = await storage.deleteProductAttribute(attributeId);
      
      if (!deleted) {
        return sendError(res, 'Failed to delete product attribute', 500);
      }
      
      logger.info('Deleted product attribute', { 
        productId, 
        attributeId
      });
      
      // Add cache control headers to ensure clients don't cache the response
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      sendSuccess(res, { success: true });
    } catch (error) {
      logger.error('Failed to delete product attribute', { error, path: req.path });
      sendError(res, 'Failed to delete product attribute', 500);
    }
  }));
}

export default registerProductAttributeRoutes;