/**
 * AI API Routes
 * 
 * This file contains routes for AI-powered features,
 * utilizing the Google Gemini API for content generation.
 */

import express from 'express';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';

const router = express.Router();

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Safety settings for the AI model
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Schema for product description generation request
const generateDescriptionSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  productCategory: z.string().optional(),
  existingDescription: z.string().optional(),
  shortDescription: z.string().optional(),
  brand: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'enthusiastic', 'technical', 'persuasive']),
  length: z.enum(['short', 'medium', 'long']),
  style: z.enum(['informative', 'storytelling', 'benefit-focused', 'comparison', 'problem-solution']),
  additionalInfo: z.string().optional(),
});

/**
 * Generate Product Description using AI
 * 
 * POST /api/ai/generate-description
 */
router.post('/generate-description', asyncHandler(async (req, res) => {
  try {
    // Validate the request body
    const validatedData = generateDescriptionSchema.parse(req.body);
    
    // Get the Gemini Pro model
    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
      safetySettings,
    });
    
    // Create the prompt
    const prompt = createDescriptionPrompt(validatedData);
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the descriptions from the response
    let descriptions = parseDescriptions(text);
    
    // If parsing failed, use the whole text as a single description
    if (descriptions.length === 0) {
      descriptions = [text.trim()];
    }
    
    res.json({
      success: true,
      data: {
        descriptions,
      },
    });
  } catch (error) {
    console.error('Error generating descriptions:', error);
    
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate descriptions',
    });
  }
}));

// Schema for SEO optimization request
const seoOptimizationSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  productCategory: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  brand: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  additionalInfo: z.string().optional(),
});

/**
 * Generate SEO-optimized content using AI
 * 
 * POST /api/ai/optimize-seo
 */
router.post('/optimize-seo', asyncHandler(async (req, res) => {
  try {
    // Validate the request body
    const validatedData = seoOptimizationSchema.parse(req.body);
    
    // Get the Gemini Pro model
    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
      safetySettings,
    });
    
    // Create the prompt
    const prompt = createSeoOptimizationPrompt(validatedData);
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse JSON from the response
    try {
      // Extract JSON part from the response if it's not a pure JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : text;
      const seoData = JSON.parse(jsonString);
      
      res.json({
        success: true,
        data: seoData,
      });
    } catch (jsonError) {
      console.error('Error parsing JSON from AI response:', jsonError);
      res.json({
        success: true,
        data: {
          metaTitle: validatedData.productName,
          metaDescription: text.slice(0, 160).trim(),
          suggestions: [],
          rawResponse: text,
        },
      });
    }
  } catch (error) {
    console.error('Error optimizing SEO:', error);
    
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to optimize SEO',
    });
  }
}));

/**
 * Create a prompt for product description generation
 */
function createDescriptionPrompt(data: z.infer<typeof generateDescriptionSchema>): string {
  // Define length in words
  const lengthMap = {
    short: '50-100',
    medium: '100-200',
    long: '200-300',
  };
  
  let prompt = `
You are a professional e-commerce content writer specializing in compelling product descriptions.

TASK:
Generate THREE unique and engaging product descriptions for the following product, formatted as "DESCRIPTION 1:", "DESCRIPTION 2:", and "DESCRIPTION 3:".

PRODUCT DETAILS:
- Name: ${data.productName}
${data.brand ? `- Brand: ${data.brand}` : ''}
${data.productCategory ? `- Category: ${data.productCategory}` : ''}
${data.shortDescription ? `- Short Description: ${data.shortDescription}` : ''}
${data.existingDescription ? `- Current Description: ${data.existingDescription}` : ''}
${data.additionalInfo ? `- Additional Information: ${data.additionalInfo}` : ''}

REQUIREMENTS:
- Tone: ${data.tone.charAt(0).toUpperCase() + data.tone.slice(1)}
- Length: ${lengthMap[data.length]} words
- Style: ${data.style.charAt(0).toUpperCase() + data.style.slice(1)}
- Focus on highlighting key benefits and features
- Include persuasive language that encourages purchases
- Avoid overused phrases and clichés
- Write for readability and scanability
- Ensure accuracy and authenticity
- Target South African e-commerce customers

FORMAT YOUR RESPONSE WITH THREE DESCRIPTIONS LIKE THIS:
DESCRIPTION 1:
[First product description]

DESCRIPTION 2:
[Second product description]

DESCRIPTION 3:
[Third product description]
`.trim();

  return prompt;
}

/**
 * Create a prompt for SEO optimization
 */
function createSeoOptimizationPrompt(data: z.infer<typeof seoOptimizationSchema>): string {
  let prompt = `
You are an SEO expert specializing in e-commerce websites. Your task is to generate SEO-optimized content and recommendations for the following product.

PRODUCT DETAILS:
- Name: ${data.productName}
${data.brand ? `- Brand: ${data.brand}` : ''}
${data.productCategory ? `- Category: ${data.productCategory}` : ''}
${data.description ? `- Full Description: ${data.description}` : ''}
${data.shortDescription ? `- Short Description: ${data.shortDescription}` : ''}
${data.keywords && data.keywords.length > 0 ? `- Current Keywords: ${data.keywords.join(', ')}` : ''}
${data.additionalInfo ? `- Additional Information: ${data.additionalInfo}` : ''}

TASK:
Create an SEO optimization package for this product including:
1. A meta title (under 60 characters)
2. A meta description (under 160 characters)
3. 5-7 recommended keywords or phrases
4. 3-5 SEO improvement suggestions

FORMAT YOUR RESPONSE AS A JSON OBJECT:
{
  "metaTitle": "SEO-optimized title under 60 characters",
  "metaDescription": "Compelling meta description under 160 characters that includes main keywords and encourages clicks",
  "keywords": [
    "primary keyword phrase",
    "secondary keyword phrase",
    "long-tail keyword 1",
    "long-tail keyword 2",
    "brand + product keyword",
    "location-based keyword"
  ],
  "suggestions": [
    "Specific suggestion for improving product page SEO",
    "Suggestion about keyword usage in headlines",
    "Recommendation about image alt text",
    "Suggestion about internal linking"
  ]
}

Remember to:
- Include keywords naturally in the meta title and description
- Make the meta description compelling to encourage clicks
- Use relevant keywords specific to the South African market
- Ensure the keywords are actually relevant to the product
- Consider search intent with your suggestions
`.trim();

  return prompt;
}

/**
 * Parse descriptions from AI response
 */
function parseDescriptions(text: string): string[] {
  const descriptions: string[] = [];
  
  // Try to extract descriptions with numbered format
  const regex = /DESCRIPTION\s*(\d+)\s*:\s*([\s\S]*?)(?=DESCRIPTION\s*\d+\s*:|$)/gi;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const description = match[2].trim();
    if (description) {
      descriptions.push(description);
    }
  }
  
  return descriptions;
}

export default router;