/**
 * AI API Routes
 * 
 * Provides endpoints for AI-powered product content generation,
 * including descriptions and SEO suggestions.
 */

import express, { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import { sendSuccess, sendError } from '../api-response';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router: Router = express.Router();

// Configure API key
const apiKey = process.env.GEMINI_API_KEY;
let genAI: GoogleGenerativeAI | null = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

// AI Service Status Endpoint
router.get('/ai/status', asyncHandler(async (req: Request, res: Response) => {
  const available = !!apiKey && !!genAI;
  
  return sendSuccess(res, {
    available,
    provider: available ? 'Google Gemini' : null,
    message: available ? 'AI services are available' : 'AI services are not configured',
  });
}));

// Description Generation Endpoint
router.post('/ai/suggest-description', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    productName: z.string().min(1, "Product name is required"),
    category: z.string().optional(),
    attributes: z.array(z.any()).optional(),
  });
  
  try {
    const { productName, category, attributes } = schema.parse(req.body);
    
    if (!apiKey || !genAI) {
      return sendError(res, 'AI services are not configured', 503, 'AI_NOT_AVAILABLE');
    }
    
    // Build prompt based on provided information
    let prompt = `Generate three unique, engaging product descriptions for the following product:\n\nProduct: ${productName}`;
    
    if (category) {
      prompt += `\nCategory: ${category}`;
    }
    
    if (attributes && attributes.length > 0) {
      prompt += `\nAttributes: ${attributes.map((attr: any) => 
        `${attr.name || attr.displayName}: ${attr.value || attr.selectedOptions?.join(', ')}`
      ).join(', ')}`;
    }
    
    prompt += `\n\nRequirements:
    - Each description should be 2-3 paragraphs
    - Be conversational and engaging
    - Highlight key features and benefits
    - Use persuasive language suitable for e-commerce
    - Focus on how the product solves problems or improves life
    - Each description should have a different focus or angle
    
    Please format your response as a numbered list with three distinct descriptions.`;
    
    // Generate description using Google Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Parse the descriptions
    const descriptions = text
      .split(/\d+\.\s+/g)
      .filter(Boolean)
      .map(desc => desc.trim());
    
    return sendSuccess(res, {
      descriptions: descriptions.slice(0, 3), // Ensure we only return 3 descriptions
    });
  } catch (error: any) {
    console.error('Error generating descriptions:', error);
    
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid request data', 400, 'VALIDATION_ERROR', error.errors);
    }
    
    return sendError(res, 'Failed to generate descriptions', 500, 'AI_GENERATION_ERROR', error.message);
  }
}));

// SEO Optimization Endpoint
router.post('/ai/optimize-seo', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    productName: z.string().min(1, "Product name is required"),
    description: z.string().min(1, "Description is required"),
    category: z.string().optional(),
  });
  
  try {
    const { productName, description, category } = schema.parse(req.body);
    
    if (!apiKey || !genAI) {
      return sendError(res, 'AI services are not configured', 503, 'AI_NOT_AVAILABLE');
    }
    
    // Build prompt based on provided information
    let prompt = `Generate SEO optimization suggestions for the following product:
    
    Product Name: ${productName}
    ${category ? `Category: ${category}` : ''}
    Current Description: ${description}
    
    Please provide:
    1. A list of 5-8 relevant SEO keywords/phrases for this product
    2. An optimized meta title (max 60 characters)
    3. An optimized meta description (max 160 characters)
    4. Three specific content improvement suggestions to enhance SEO value
    
    Format your response in clear sections so it can be easily parsed.`;
    
    // Generate SEO suggestions using Google Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Basic parsing of the output
    const keywordsMatch = text.match(/Keywords?:?\s*\n?([\s\S]*?)(?:\n\n|\n\d\.|\nMeta)/i);
    const metaTitleMatch = text.match(/Meta Title:?\s*\n?(.*?)(?:\n\n|\n\d\.|\nMeta Description)/i);
    const metaDescriptionMatch = text.match(/Meta Description:?\s*\n?(.*?)(?:\n\n|\n\d\.|\nContent)/i);
    const suggestionsMatch = text.match(/Content (Improvement )?Suggestions:?\s*\n?([\s\S]*?)(?:\n\n|$)/i);
    
    const keywords = keywordsMatch 
      ? keywordsMatch[1].split(/\n-|\n\*|\n\d\.|\s*,\s*/).map(k => k.trim()).filter(Boolean)
      : [];
    
    const metaTitle = metaTitleMatch ? metaTitleMatch[1].trim() : '';
    const metaDescription = metaDescriptionMatch ? metaDescriptionMatch[1].trim() : '';
    
    const contentSuggestions = suggestionsMatch
      ? suggestionsMatch[2].split(/\n-|\n\*|\n\d\./).map(s => s.trim()).filter(Boolean)
      : [];
    
    return sendSuccess(res, {
      keywords,
      metaTitle,
      metaDescription,
      contentSuggestions,
      rawResponse: text,
    });
  } catch (error: any) {
    console.error('Error generating SEO suggestions:', error);
    
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid request data', 400, 'VALIDATION_ERROR', error.errors);
    }
    
    return sendError(res, 'Failed to generate SEO suggestions', 500, 'AI_GENERATION_ERROR', error.message);
  }
}));

export default router;