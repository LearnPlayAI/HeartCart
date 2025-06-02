import express, { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { 
  generateProductDescription, 
  generateProductTags, 
  optimizeSEO, 
  generateSEO,
  analyzeProductImage,
  suggestProductCategories
} from './ai-service';
import { isAuthenticated } from './auth-middleware';
import { storage } from './storage';

const router = express.Router();

// API route for suggesting a product description
router.post('/suggest-description', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { productName, categoryName, keyPoints, imageUrls } = req.body;

  if (!productName) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Product name is required'
      }
    });
  }

  try {
    const suggestions = await generateProductDescription(productName, categoryName, keyPoints, imageUrls);
    
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

// API route for analyzing a product image
router.post('/analyze-image', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Image URL is required'
      }
    });
  }

  try {
    const analysis = await analyzeProductImage(imageUrl);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error analyzing product image:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to analyze image'
      }
    });
  }
}));

// API route for generating product tags
router.post('/generate-tags', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { productName, productDescription, categoryName, imageUrls } = req.body;

  if (!productName && !productDescription) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Product name or description is required'
      }
    });
  }

  try {
    const tags = await generateProductTags(productName, productDescription, categoryName, imageUrls);
    
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

// API route for generating SEO content
router.post('/generate-seo', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { 
    productName, 
    productDescription, 
    categoryName,
    attributes,
    imageUrls
  } = req.body;

  if (!productName) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Product name is required'
      }
    });
  }

  try {
    const seoContent = await generateSEO(
      productName, 
      productDescription || '', 
      categoryName || '',
      attributes || [],
      imageUrls
    );
    
    res.json({
      success: true,
      data: seoContent
    });
  } catch (error) {
    console.error('Error generating SEO content:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to generate SEO content'
      }
    });
  }
}));

// API route for suggesting categories based on product name and description
router.post('/suggest-categories', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { productName, productDescription } = req.body;

  if (!productName || !productDescription) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Product name and description are required'
      }
    });
  }

  try {
    // Fetch all categories from the database
    const categories = await storage.getAllCategories();
    
    // Transform categories for AI processing
    const formattedCategories = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId,
      level: cat.level
    }));

    const suggestions = await suggestProductCategories(
      productName,
      productDescription,
      formattedCategories
    );
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Error suggesting categories:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to suggest categories'
      }
    });
  }
}));

export default router;