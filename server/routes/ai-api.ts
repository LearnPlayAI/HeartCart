/**
 * AI API Routes
 * 
 * This file contains the API routes for AI-powered features
 * using the Google Gemini API.
 */

import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../logger';

// Create router
const router = Router();

// Initialize the Google Generative AI client
let genAI: GoogleGenerativeAI | null = null;
let genAIModel: string = '';
let isGenAIInitialized = false;

// Initialize Gemini AI
function initializeGeminiAI() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      logger.warn('Gemini API key not found. AI features will be disabled.');
      return false;
    }
    
    genAI = new GoogleGenerativeAI(apiKey);
    genAIModel = 'gemini-1.5-flash';
    
    // Log successful initialization
    logger.info('Initialized Gemini AI with model', { 
      model: genAIModel,
      isDefault: true
    });
    
    isGenAIInitialized = true;
    return true;
  } catch (error) {
    logger.error('Failed to initialize Gemini AI', { error });
    return false;
  }
}

// Initialize on module load
initializeGeminiAI();

// Check AI availability endpoint
router.get('/status', asyncHandler(async (req, res) => {
  if (!isGenAIInitialized) {
    // Try to initialize again in case the API key was added after server start
    const initialized = initializeGeminiAI();
    if (!initialized) {
      return res.json({
        success: true,
        data: {
          available: false,
          provider: 'None',
          message: 'AI services are not available. API key is missing.'
        }
      });
    }
  }
  
  return res.json({
    success: true,
    data: {
      available: true,
      provider: 'Google Gemini',
      message: 'AI services are available'
    }
  });
}));

// Generate product descriptions
router.post('/descriptions', asyncHandler(async (req, res) => {
  if (!isGenAIInitialized || !genAI) {
    return res.status(503).json({
      success: false,
      error: 'AI services are not available'
    });
  }
  
  try {
    const { productName, category, keywords, tone, attributes } = req.body;
    
    // Validate required fields
    if (!productName) {
      return res.status(400).json({
        success: false,
        error: 'Product name is required'
      });
    }
    
    // Build prompt for the AI
    const keywordsStr = keywords && keywords.length > 0 
      ? `Incorporate these keywords: ${keywords.join(', ')}. ` 
      : '';
      
    const attributesStr = attributes && attributes.length > 0
      ? `Consider these product attributes: ${attributes.map(a => `${a.name}: ${a.value}`).join(', ')}. `
      : '';
      
    const categoryStr = category ? `This product belongs to the ${category} category. ` : '';
    
    const toneStr = tone ? `Use a ${tone} tone. ` : 'Use a professional tone. ';
    
    const prompt = `
      Generate 3 different engaging product descriptions for an e-commerce website.
      
      Product: ${productName}
      ${categoryStr}
      ${attributesStr}
      ${keywordsStr}
      ${toneStr}
      
      Each description should be detailed, accurate, and optimized for conversion.
      Include key benefits and features. 
      Make each description around 100-150 words and format them well with paragraphs.
      Target South African customers and use language that would appeal to them.
      
      Return exactly 3 different descriptions, each unique in approach.
    `;
    
    // Generate content with Gemini
    const model = genAI.getGenerativeModel({ model: genAIModel });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Parse the output into separate descriptions
    const descriptions = text
      .split(/Description \d+:|^\d+[.:]|^\d+\)\s/m)
      .filter(desc => desc && desc.trim().length > 0)
      .map(desc => desc.trim())
      .slice(0, 3); // Ensure we get exactly 3 descriptions
    
    return res.json({
      success: true,
      descriptions
    });
  } catch (error: any) {
    logger.error('Error generating product descriptions', { error });
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while generating descriptions'
    });
  }
}));

// Generate SEO suggestions
router.post('/seo', asyncHandler(async (req, res) => {
  if (!isGenAIInitialized || !genAI) {
    return res.status(503).json({
      success: false,
      error: 'AI services are not available'
    });
  }
  
  try {
    const { productName, description, category, targetKeywords } = req.body;
    
    // Validate required fields
    if (!productName || !description) {
      return res.status(400).json({
        success: false,
        error: 'Product name and description are required'
      });
    }
    
    const targetKeywordsStr = targetKeywords && targetKeywords.length > 0
      ? `Target these specific keywords: ${targetKeywords.join(', ')}. `
      : '';
      
    const categoryStr = category ? `This product belongs to the ${category} category. ` : '';
    
    const prompt = `
      Generate 2 different SEO optimization suggestions for this e-commerce product:
      
      Product: ${productName}
      ${categoryStr}
      
      Product Description: 
      ${description}
      
      ${targetKeywordsStr}
      
      For each suggestion, provide:
      1. A meta title (maximum 60 characters)
      2. A meta description (maximum 160 characters)
      3. 5-7 relevant keywords (comma-separated)
      
      Optimize for South African e-commerce and local search patterns.
      Format your response as JSON with this structure:
      [
        {
          "metaTitle": "Title 1...",
          "metaDescription": "Description 1...",
          "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
        },
        {
          "metaTitle": "Title 2...",
          "metaDescription": "Description 2...",
          "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
        }
      ]
    `;
    
    // Generate content with Gemini
    const model = genAI.getGenerativeModel({ model: genAIModel });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Try to parse the response as JSON
    try {
      // Extract JSON from the response (in case there's additional text)
      const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from response');
      }
      
      const jsonStr = jsonMatch[0];
      const suggestions = JSON.parse(jsonStr);
      
      // Validate the structure of the suggestions
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        throw new Error('Invalid response format');
      }
      
      // Ensure each suggestion has the required fields
      const validatedSuggestions = suggestions.map(suggestion => ({
        metaTitle: suggestion.metaTitle || '',
        metaDescription: suggestion.metaDescription || '',
        keywords: Array.isArray(suggestion.keywords) ? suggestion.keywords : []
      }));
      
      return res.json({
        success: true,
        suggestions: validatedSuggestions
      });
    } catch (parseError) {
      logger.error('Error parsing SEO suggestions', { error: parseError, text });
      
      // Fallback: Manually extract information from text
      const fallbackSuggestions = [
        {
          metaTitle: `${productName} | Premium Quality ${category || 'Product'}`,
          metaDescription: `Shop ${productName}. Premium quality ${category || 'product'} for South African customers. Fast shipping, best prices & excellent quality.`,
          keywords: [...(targetKeywords || []), productName.toLowerCase(), 'south africa', 'quality', 'online shopping']
        }
      ];
      
      return res.json({
        success: true,
        suggestions: fallbackSuggestions
      });
    }
  } catch (error: any) {
    logger.error('Error generating SEO suggestions', { error });
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while generating SEO suggestions'
    });
  }
}));

// Generate product tags
router.post('/tags', asyncHandler(async (req, res) => {
  if (!isGenAIInitialized || !genAI) {
    return res.status(503).json({
      success: false,
      error: 'AI services are not available'
    });
  }
  
  try {
    const { productName, description, category } = req.body;
    
    // Validate required fields
    if (!productName) {
      return res.status(400).json({
        success: false,
        error: 'Product name is required'
      });
    }
    
    const categoryStr = category ? `Category: ${category}` : '';
    const descriptionStr = description ? `Description: ${description}` : '';
    
    const prompt = `
      Generate 10 relevant tags for this product that would be useful for an e-commerce website:
      
      Product: ${productName}
      ${categoryStr}
      ${descriptionStr}
      
      Rules:
      - Each tag should be 1-3 words maximum
      - Tags should be relevant for South African e-commerce
      - Include a mix of feature tags, benefit tags, and category tags
      - No hashtag symbols, just the words
      - Format as a JSON array of strings
      
      Example format:
      ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"]
    `;
    
    // Generate content with Gemini
    const model = genAI.getGenerativeModel({ model: genAIModel });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Try to parse the response as JSON
    try {
      // Extract JSON from the response (in case there's additional text)
      const jsonMatch = text.match(/\[\s*"[\s\S]*"\s*\]/);
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from response');
      }
      
      const jsonStr = jsonMatch[0];
      const tags = JSON.parse(jsonStr);
      
      // Validate the structure of the tags
      if (!Array.isArray(tags) || tags.length === 0) {
        throw new Error('Invalid response format');
      }
      
      return res.json({
        success: true,
        tags: tags.slice(0, 10) // Ensure we return no more than 10 tags
      });
    } catch (parseError) {
      logger.error('Error parsing tags', { error: parseError, text });
      
      // Fallback: Extract words that might be tags
      const fallbackTags = [
        productName.toLowerCase(),
        category ? category.toLowerCase() : 'product',
        'quality',
        'south africa',
        'online'
      ];
      
      return res.json({
        success: true,
        tags: fallbackTags
      });
    }
  } catch (error: any) {
    logger.error('Error generating tags', { error });
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while generating tags'
    });
  }
}));

export default router;