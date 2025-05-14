/**
 * AI API Routes
 * 
 * This file contains routes for AI-related functionality
 * like product description generation and SEO optimization.
 */

import express, { Request, Response } from "express";
import { isAuthenticated, isAdmin } from "../auth-middleware";
import { asyncHandler } from "../error-handler";
import { AppError, ErrorCode } from "../error-types";
import { validateRequest } from "../validation-middleware";
import { z } from "zod";
import { logger } from "../logger";
import { sendSuccess } from "../api-response";

// Try to import AI client if available
let aiClient: any = null;

try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  
  // If environment variable is set, initialize the AI client
  if (process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    logger.info("Initialized Gemini AI with model", { 
      model: 'gemini-1.5-flash',
      isDefault: true
    });
  }
} catch (error) {
  logger.error("Failed to initialize AI client", { error });
}

// Validation schemas
const descriptionRequestSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  category: z.string().optional(),
  attributes: z.array(z.any()).optional()
});

const seoRequestSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Product description is required"),
  category: z.string().optional()
});

const router = express.Router();

/**
 * Check AI service status
 * GET /api/ai/status
 */
router.get(
  "/api/ai/status",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const aiAvailable = !!aiClient;
    
    sendSuccess(res, {
      available: aiAvailable,
      provider: aiAvailable ? "Google Gemini" : null
    });
  })
);

/**
 * Generate product description suggestions
 * POST /api/ai/suggest-description
 */
router.post(
  "/api/ai/suggest-description",
  isAuthenticated,
  isAdmin,
  validateRequest({ body: descriptionRequestSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    if (!aiClient) {
      throw new AppError(
        "AI services are not available. Please check API key configuration.",
        ErrorCode.SERVICE_UNAVAILABLE,
        503
      );
    }
    
    const { productName, category, attributes } = req.body;
    
    try {
      // Create prompt based on available information
      let prompt = `Generate three different professional product descriptions for an e-commerce store. 
      Product Name: ${productName}`;
      
      if (category) {
        prompt += `\nCategory: ${category}`;
      }
      
      if (attributes && attributes.length > 0) {
        prompt += "\nAttributes:";
        for (const attr of attributes) {
          if (attr.attributeId && attr.optionIds && attr.optionIds.length > 0) {
            prompt += `\n- ${attr.attributeId}: ${attr.optionIds.join(", ")}`;
          }
        }
      }
      
      prompt += `\n\nPlease create three distinct product descriptions:
      1. A brief description (50-75 words)
      2. A standard description (100-150 words)
      3. A detailed description (200-250 words)
      
      Each description should:
      - Highlight the key features and benefits
      - Use professional, engaging language
      - Include appropriate keywords for SEO
      - Be well-formatted with paragraphs and bullet points where appropriate
      - Focus on benefits to the customer
      
      Format each description separately and number them 1, 2, and 3.`;
      
      // Generate content
      const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the generated content into separate descriptions
      const descriptions = parseDescriptions(text);
      
      sendSuccess(res, {
        suggestions: descriptions
      });
    } catch (error) {
      logger.error("Error generating product descriptions", { error, productName });
      throw new AppError(
        "Failed to generate product descriptions. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }
  })
);

/**
 * Generate SEO optimization suggestions
 * POST /api/ai/optimize-seo
 */
router.post(
  "/api/ai/optimize-seo",
  isAuthenticated,
  isAdmin,
  validateRequest({ body: seoRequestSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    if (!aiClient) {
      throw new AppError(
        "AI services are not available. Please check API key configuration.",
        ErrorCode.SERVICE_UNAVAILABLE,
        503
      );
    }
    
    const { productName, description, category } = req.body;
    
    try {
      // Create prompt for SEO optimization
      let prompt = `Generate SEO optimization for an e-commerce product listing.
      
      Product Name: ${productName}
      ${category ? `Category: ${category}` : ''}
      
      Current Description:
      ${description}
      
      Please provide the following SEO elements:
      
      1. Meta Title (50-60 characters):
      A concise, keyword-rich title that will appear in search engine results.
      
      2. Meta Description (120-160 characters):
      A compelling summary that encourages clicks from search results.
      
      3. Meta Keywords (5-8 keywords/phrases, comma-separated):
      Relevant keywords for the product.
      
      Format your response with clear headers for each element.`;
      
      // Generate content
      const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the generated SEO content
      const seoElements = parseSeoElements(text);
      
      sendSuccess(res, seoElements);
    } catch (error) {
      logger.error("Error generating SEO suggestions", { error, productName });
      throw new AppError(
        "Failed to generate SEO suggestions. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }
  })
);

// Helper function to parse descriptions from AI response
function parseDescriptions(text: string): string[] {
  // Split by numbered descriptions
  const descriptions: string[] = [];
  
  // Simple parsing to extract numbered descriptions
  const sections = text.split(/\s*\d+\s*[.)]\s*/);
  
  // Skip the first empty section if exists
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i].trim();
    if (section) {
      descriptions.push(section);
    }
  }
  
  // If parsing fails, return the entire text as one description
  if (descriptions.length === 0) {
    return [text.trim()];
  }
  
  return descriptions;
}

// Helper function to parse SEO elements from AI response
function parseSeoElements(text: string): {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
} {
  let metaTitle = '';
  let metaDescription = '';
  let metaKeywords = '';
  
  // Extract Meta Title
  const titleMatch = text.match(/meta title[:\s]+(.*?)(?=\n\n|\n\d+\.|\n[mM]eta [dD]escription)/is);
  if (titleMatch && titleMatch[1]) {
    metaTitle = titleMatch[1].trim();
  }
  
  // Extract Meta Description
  const descMatch = text.match(/meta description[:\s]+(.*?)(?=\n\n|\n\d+\.|\n[mM]eta [kK]eywords)/is);
  if (descMatch && descMatch[1]) {
    metaDescription = descMatch[1].trim();
  }
  
  // Extract Meta Keywords
  const keywordsMatch = text.match(/meta keywords[:\s]+(.*?)(?=\n\n|\n\d+\.|\Z)/is);
  if (keywordsMatch && keywordsMatch[1]) {
    metaKeywords = keywordsMatch[1].trim();
  }
  
  return {
    metaTitle,
    metaDescription,
    metaKeywords
  };
}

export default router;