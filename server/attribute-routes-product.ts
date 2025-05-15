/**
 * Product Attribute API Routes for TeeMeYou
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
      
      // Get options for this attribute
      if (!attributeGroups[attributeId].optionsLoaded) {
        const options = await storage.getAttributeOptions(attributeId);
        if (options && options.length > 0) {
          attributeGroups[attributeId].options = options.map(opt => ({
            id: opt.id,
            value: opt.value,
            displayValue: opt.displayValue || opt.value
          }));
          attributeGroups[attributeId].optionsLoaded = true;
        }
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
}

export default registerProductAttributeRoutes;