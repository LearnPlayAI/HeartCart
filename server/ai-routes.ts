import express, { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { generateProductDescription, generateProductTags, optimizeSEO } from './ai-service';
import { isAuthenticated } from './auth-middleware';

const router = express.Router();

// API route for suggesting a product description
router.post('/suggest-description', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { productName, categoryName, keyPoints } = req.body;

  if (!productName) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Product name is required'
      }
    });
  }

  try {
    const suggestions = await generateProductDescription(productName, categoryName, keyPoints);
    
    res.json({
      success: true,
      data: {
        suggestions
      }
    });
  } catch (error) {
    console.error('Error generating product description:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to generate description'
      }
    });
  }
}));

// API route for generating product tags
router.post('/generate-tags', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { productName, productDescription, categoryName } = req.body;

  if (!productName && !productDescription) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Product name or description is required'
      }
    });
  }

  try {
    const tags = await generateProductTags(productName, productDescription, categoryName);
    
    res.json({
      success: true,
      data: {
        tags
      }
    });
  } catch (error) {
    console.error('Error generating product tags:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to generate tags'
      }
    });
  }
}));

// API route for optimizing SEO metadata
router.post('/optimize-seo', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { 
    productName, 
    productDescription, 
    categoryName,
    currentTitle,
    currentDescription,
    currentKeywords
  } = req.body;

  if (!productName && !productDescription) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Product name or description is required'
      }
    });
  }

  try {
    const suggestions = await optimizeSEO(
      productName, 
      productDescription, 
      categoryName,
      currentTitle,
      currentDescription,
      currentKeywords
    );
    
    res.json({
      success: true,
      data: {
        suggestions
      }
    });
  } catch (error) {
    console.error('Error optimizing SEO:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to optimize SEO'
      }
    });
  }
}));

export default router;