import express, { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { logger } from './logger';
import { generateProductDescription, generateSEOData, generateProductTags } from './ai-service';
import { checkAuth } from './auth-middleware';

// Create AI routes router
const aiRouter = express.Router();

// Add authentication middleware to all AI routes
aiRouter.use(checkAuth);

/**
 * Generate product description suggestions
 * POST /api/ai/suggest-description
 */
aiRouter.post('/suggest-description', asyncHandler(async (req: Request, res: Response) => {
  const { productName, currentDescription, categoryName, brandName, keyFeatures } = req.body;
  
  if (!productName) {
    return res.status(400).json({
      success: false,
      error: { message: 'Product name is required' }
    });
  }
  
  logger.debug('Generating product description suggestions', {
    productName,
    categoryName,
    brandName,
    hasCurrentDescription: !!currentDescription,
    featureCount: keyFeatures?.length
  });
  
  try {
    const suggestions = await generateProductDescription(
      productName,
      currentDescription || '',
      categoryName || '',
      brandName || '',
      keyFeatures || []
    );
    
    return res.json({
      success: true,
      data: { suggestions }
    });
  } catch (error) {
    logger.error('Error generating product description suggestions', {
      error,
      productName
    });
    
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to generate descriptions' }
    });
  }
}));

/**
 * Generate SEO optimization suggestions
 * POST /api/ai/optimize-seo
 */
aiRouter.post('/optimize-seo', asyncHandler(async (req: Request, res: Response) => {
  const {
    productName,
    currentTitle,
    currentDescription,
    currentKeywords,
    productDescription,
    categoryName
  } = req.body;
  
  if (!productName) {
    return res.status(400).json({
      success: false,
      error: { message: 'Product name is required' }
    });
  }
  
  logger.debug('Generating SEO optimization suggestions', {
    productName,
    categoryName,
    hasProductDescription: !!productDescription
  });
  
  try {
    const suggestions = await generateSEOData(
      productName,
      productDescription || '',
      categoryName || '',
      currentTitle || '',
      currentDescription || '',
      currentKeywords || []
    );
    
    return res.json({
      success: true,
      data: { suggestions }
    });
  } catch (error) {
    logger.error('Error generating SEO suggestions', {
      error,
      productName
    });
    
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to generate SEO suggestions' }
    });
  }
}));

/**
 * Generate product tags
 * POST /api/ai/generate-tags
 */
aiRouter.post('/generate-tags', asyncHandler(async (req: Request, res: Response) => {
  const { productName, productDescription, productImageBase64, categoryName } = req.body;
  
  if (!productName) {
    return res.status(400).json({
      success: false,
      error: { message: 'Product name is required' }
    });
  }
  
  logger.debug('Generating product tags', {
    productName,
    categoryName,
    hasImage: !!productImageBase64,
    descriptionLength: productDescription?.length
  });
  
  try {
    const tags = await generateProductTags(
      productImageBase64 || '',
      productName,
      productDescription || '',
      undefined // productId is optional
    );
    
    return res.json({
      success: true,
      data: { tags }
    });
  } catch (error) {
    logger.error('Error generating product tags', {
      error,
      productName
    });
    
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to generate product tags' }
    });
  }
}));

/**
 * Record AI suggestion feedback
 * POST /api/ai/feedback
 */
aiRouter.post('/feedback', asyncHandler(async (req: Request, res: Response) => {
  const { suggestionType, suggestionIndex, feedbackType, suggestion } = req.body;
  
  // In a production system, we would store this feedback for model improvement
  logger.info('AI suggestion feedback received', {
    suggestionType,
    suggestionIndex,
    feedbackType,
    userId: req.user?.id
  });
  
  return res.json({
    success: true,
    data: { recorded: true }
  });
}));

export default aiRouter;