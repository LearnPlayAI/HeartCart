import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import sharp from 'sharp';

// Environment variable validation
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize the Google Generative AI API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize the Gemini Pro Vision model for image tasks
let geminiProVision: GenerativeModel;
try {
  geminiProVision = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
} catch (error) {
  console.error('Failed to initialize Gemini Pro Vision model:', error);
  throw error;
}

/**
 * Convert base64 string to Buffer
 */
function base64ToBuffer(base64String: string): Buffer {
  // Extract base64 data part if it includes data URI scheme
  const base64Data = base64String.includes('base64,') 
    ? base64String.split('base64,')[1] 
    : base64String;
    
  return Buffer.from(base64Data, 'base64');
}

/**
 * Convert Buffer to base64 string with proper data URI
 */
function bufferToBase64(buffer: Buffer, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Process an image to remove its background using Gemini AI
 */
export async function removeImageBackground(imageBase64: string): Promise<string> {
  try {
    // Extract content type and convert to buffer
    const imageBuffer = base64ToBuffer(imageBase64);
    
    // Resize image to reduce processing time if needed
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize({ width: 1024, height: 1024, fit: 'inside' })
      .toBuffer();
    
    // Create prompt
    const imageData = bufferToBase64(resizedImageBuffer);
    
    // Create the generation request
    const result = await geminiProVision.generateContent([
      "Please remove the background from this product image, preserving only the product with a transparent background. Return only the processed image without any text.",
      { inlineData: { data: imageData, mimeType: 'image/jpeg' } }
    ]);
    
    // Get the response
    const response = await result.response;
    
    // Check if we got image parts in the response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return part.inlineData.data;
        }
      }
    }
    
    throw new Error('No processed image was returned from Gemini AI');
  } catch (error) {
    console.error('Background removal failed:', error);
    throw new Error('Failed to remove background: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Generate product tags based on image and product information
 */
export async function generateProductTags(
  imageBase64: string, 
  productName: string, 
  productDescription: string
): Promise<string[]> {
  try {
    // Extract content type and convert to buffer
    const imageBuffer = base64ToBuffer(imageBase64);
    
    // Resize image to reduce processing time
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize({ width: 512, height: 512, fit: 'inside' })
      .toBuffer();
    
    // Create prompt
    const imageData = bufferToBase64(resizedImageBuffer);
    
    // Create the generation request
    const result = await geminiProVision.generateContent([
      `Generate 5-7 relevant product tags for an e-commerce website based on this product image, name, and description. 
      Focus on features, use cases, materials, style, benefits, and relevant categories.
      Return only the tags in a comma-separated list format, with each tag being 1-3 words maximum.
      
      Product Name: ${productName}
      Product Description: ${productDescription}`,
      { inlineData: { data: imageData, mimeType: 'image/jpeg' } }
    ]);
    
    // Get the response
    const response = await result.response;
    const responseText = response.text();
    
    // Parse comma-separated tags
    const tags = responseText
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag && tag.length > 0);
    
    return tags;
  } catch (error) {
    console.error('Tag generation failed:', error);
    throw new Error('Failed to generate tags: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Analyze product image to suggest product details
 */
export async function analyzeProductImage(imageBase64: string): Promise<{
  suggestedName?: string;
  suggestedDescription?: string;
  suggestedCategory?: string;
  suggestedBrand?: string;
  suggestedTags?: string[];
}> {
  try {
    // Extract content type and convert to buffer
    const imageBuffer = base64ToBuffer(imageBase64);
    
    // Resize image to reduce processing time
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize({ width: 512, height: 512, fit: 'inside' })
      .toBuffer();
    
    // Create prompt
    const imageData = bufferToBase64(resizedImageBuffer);
    
    // Create the generation request
    const result = await geminiProVision.generateContent([
      `Analyze this product image and provide the following details formatted as JSON:
      1. "name": A concise product name (max 10 words)
      2. "description": A detailed product description (max 100 words)
      3. "category": A single likely product category (e.g., Electronics, Clothing, Home Decor, etc.)
      4. "brand": A likely brand name if visible (otherwise leave blank)
      5. "tags": An array of 5-7 relevant tags (each 1-3 words)
      
      Format the response as valid JSON only, with no additional text.`,
      { inlineData: { data: imageData, mimeType: 'image/jpeg' } }
    ]);
    
    // Get the response
    const response = await result.response;
    const responseText = response.text();
    
    // Parse JSON response
    try {
      // First, try to parse the response as-is
      const jsonResponse = JSON.parse(responseText);
      return {
        suggestedName: jsonResponse.name,
        suggestedDescription: jsonResponse.description,
        suggestedCategory: jsonResponse.category,
        suggestedBrand: jsonResponse.brand,
        suggestedTags: jsonResponse.tags
      };
    } catch (jsonError) {
      // If direct parsing fails, try to extract JSON from the text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        try {
          const extractedJson = JSON.parse(jsonStr);
          return {
            suggestedName: extractedJson.name,
            suggestedDescription: extractedJson.description,
            suggestedCategory: extractedJson.category,
            suggestedBrand: extractedJson.brand,
            suggestedTags: extractedJson.tags
          };
        } catch (extractError) {
          throw new Error('Failed to parse extracted JSON');
        }
      } else {
        throw new Error('No valid JSON found in response');
      }
    }
  } catch (error) {
    console.error('Product analysis failed:', error);
    throw new Error('Failed to analyze product image: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}