import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import sharp from 'sharp';
import { storage } from './storage';

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
    // Check if imageBase64 is valid
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new Error('Invalid image data provided');
    }
    
    // Extract content type and convert to buffer
    const imageBuffer = base64ToBuffer(imageBase64);
    
    // Resize image and convert to PNG for consistency
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize({ width: 1024, height: 1024, fit: 'inside' })
      .png() // Convert to PNG format for consistency
      .toBuffer();
    
    // Create prompt with image data
    const imageData = bufferToBase64(resizedImageBuffer, 'image/png');
    
    // Create the generation request
    const result = await geminiProVision.generateContent([
      "Please remove the background from this product image, preserving only the product with a transparent background. Return only the processed image without any text.",
      { inlineData: { data: imageData, mimeType: 'image/png' } }
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
    let imageData: string;
    
    // Check if imageBase64 is a URL or a base64 string
    if (imageBase64.startsWith('http')) {
      // If it's a URL, we'll skip image processing and use text-only prompt
      console.log("Image URL provided instead of base64, using text-only prompt");
      
      // Generate tags based only on text
      const textOnlyResult = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        .generateContent([
          `Generate 5-7 relevant product tags for an e-commerce website based on this product information. 
          Focus on features, use cases, materials, style, benefits, and relevant categories.
          Return only the tags in a comma-separated list format, with each tag being 1-3 words maximum.
          
          Product Name: ${productName}
          Product Description: ${productDescription}`
        ]);
      
      const textResponse = await textOnlyResult.response;
      const responseText = textResponse.text();
      
      // Parse comma-separated tags
      const tags = responseText
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag && tag.length > 0);
      
      return tags;
    }
    
    // Process image if we have a base64 string
    try {
      // Extract content type and convert to buffer
      const imageBuffer = base64ToBuffer(imageBase64);
      
      // Resize image to reduce processing time
      const resizedImageBuffer = await sharp(imageBuffer)
        .resize({ width: 512, height: 512, fit: 'inside' })
        .png() // Convert to PNG format for consistency
        .toBuffer();
      
      // Create prompt with image
      imageData = bufferToBase64(resizedImageBuffer, 'image/png');
    } catch (imageError) {
      console.warn('Image processing failed, falling back to text-only:', imageError);
      
      // Generate tags based only on text as fallback
      const textOnlyResult = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        .generateContent([
          `Generate 5-7 relevant product tags for an e-commerce website based on this product information. 
          Focus on features, use cases, materials, style, benefits, and relevant categories.
          Return only the tags in a comma-separated list format, with each tag being 1-3 words maximum.
          
          Product Name: ${productName}
          Product Description: ${productDescription}`
        ]);
      
      const textResponse = await textOnlyResult.response;
      const responseText = textResponse.text();
      
      // Parse comma-separated tags
      const tags = responseText
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag && tag.length > 0);
      
      return tags;
    }
    
    // Create the generation request with image
    const result = await geminiProVision.generateContent([
      `Generate 5-7 relevant product tags for an e-commerce website based on this product image, name, and description. 
      Focus on features, use cases, materials, style, benefits, and relevant categories.
      Return only the tags in a comma-separated list format, with each tag being 1-3 words maximum.
      
      Product Name: ${productName}
      Product Description: ${productDescription}`,
      { inlineData: { data: imageData, mimeType: 'image/png' } }
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
 * Suggest selling price for a product based on cost price and product info
 */
export async function suggestPrice(
  costPrice: number,
  productName: string,
  categoryName?: string,
  categoryId?: number
): Promise<{ suggestedPrice: number; markupPercentage: number; markupSource: string }> {
  try {
    // First, try to get category-specific markup if we have a categoryId
    let markupPercentage: number | null = null; // No default markup
    let markupSource = 'ai_only'; // Default to AI-only
    
    if (categoryId) {
      try {
        // Get category-specific pricing settings
        const categorySetting = await storage.getPricingByCategoryId(categoryId);
        
        if (categorySetting) {
          markupPercentage = categorySetting.markupPercentage;
          markupSource = `category_${categoryId}`;
          console.log(`Using category-specific markup of ${markupPercentage}% for category #${categoryId}`);
        } else {
          // No category-specific setting, try global default
          markupPercentage = await storage.getDefaultMarkupPercentage();
          if (markupPercentage !== null) {
            markupSource = 'global_default';
            console.log(`Using global default markup of ${markupPercentage}%`);
          } else {
            console.log('No markup percentage defined. Will rely solely on AI suggestion.');
          }
        }
      } catch (dbError) {
        console.error('Error fetching markup settings:', dbError);
        // Continue with no markup if DB access fails
      }
    }
    
    // Create the prompt with category context (even if we already have a markup)
    // The AI might provide industry-specific insights
    const prompt = `
    As a retail pricing expert in South Africa, suggest a competitive retail price in ZAR for the following product:
    
    Product: ${productName}
    Category: ${categoryName || 'Unknown'}
    Cost Price: ${costPrice} ZAR
    
    Consider these South African market factors:
    1. The average monthly income in South Africa is around 25,000 ZAR
    2. Standard retail markups range from 40-100% depending on product category
    3. Electronics generally have 30-50% markup
    4. Fashion items typically have 50-100% markup
    5. Luxury goods can have 200%+ markup
    6. Market competition from sites like Takealot
    
    Provide only a single number representing the suggested retail price in ZAR. 
    Format response as valid JSON with a single key "suggestedPrice" with a numeric value.
    `;

    // Create the generation request
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    
    // Get the response
    const response = await result.response;
    const responseText = response.text();
    
    // Parse JSON response
    try {
      // First, try to parse the response as-is
      const jsonResponse = JSON.parse(responseText);
      let suggestedPrice = Number(jsonResponse.suggestedPrice);
      let useAiSuggestion = true;
      
      // Apply business rule: Suggested price should never be lower than cost price
      if (suggestedPrice < costPrice) {
        if (markupPercentage !== null) {
          // If AI suggestion is below cost price and we have a markup, use our markup
          suggestedPrice = costPrice * (1 + markupPercentage / 100);
          useAiSuggestion = false;
          console.log(`AI suggested price (${jsonResponse.suggestedPrice}) was below cost price. Using ${markupSource} markup: ${suggestedPrice.toFixed(2)}`);
        } else {
          // If no markup is set, just use cost price as minimum
          suggestedPrice = costPrice;
          useAiSuggestion = false;
          console.log(`AI suggested price (${jsonResponse.suggestedPrice}) was below cost price. No markup set, using cost price: ${suggestedPrice.toFixed(2)}`);
        }
      }
      
      // If AI suggestion seems reasonable, we'll use it
      // Otherwise fall back to our category markup calculation or cost price
      if (!useAiSuggestion) {
        const actualMarkupPercent = markupPercentage !== null 
          ? markupPercentage 
          : Math.round(((suggestedPrice / costPrice) - 1) * 100);
        
        return { 
          suggestedPrice, 
          markupPercentage: actualMarkupPercent, 
          markupSource: markupPercentage !== null ? markupSource : 'cost_price_minimum'
        };
      }
      
      // AI suggestion is used, but still provide markup info
      // Calculate the implied markup percentage from the AI suggestion
      const impliedMarkup = Math.round(((suggestedPrice / costPrice) - 1) * 100);
      return { 
        suggestedPrice, 
        markupPercentage: impliedMarkup, 
        markupSource: 'ai_suggestion' 
      };
    } catch (jsonError) {
      // If direct parsing fails, try to extract just the number
      const priceMatch = responseText.match(/\d+(\.\d+)?/);
      if (priceMatch) {
        let suggestedPrice = Number(priceMatch[0]);
        let useAiSuggestion = true;
        
        // Apply business rule: Suggested price should never be lower than cost price
        if (suggestedPrice < costPrice) {
          if (markupPercentage !== null) {
            // If AI suggestion is below cost price and we have a markup, use our markup
            suggestedPrice = costPrice * (1 + markupPercentage / 100);
            useAiSuggestion = false;
            console.log(`AI suggested price (${priceMatch[0]}) was below cost price. Using ${markupSource} markup: ${suggestedPrice.toFixed(2)}`);
          } else {
            // If no markup is set, just use cost price as minimum
            suggestedPrice = costPrice;
            useAiSuggestion = false;
            console.log(`AI suggested price (${priceMatch[0]}) was below cost price. No markup set, using cost price: ${suggestedPrice.toFixed(2)}`);
          }
        }
        
        // If AI suggestion seems reasonable, we'll use it
        // Otherwise fall back to our category markup calculation or cost price
        if (!useAiSuggestion) {
          const actualMarkupPercent = markupPercentage !== null 
            ? markupPercentage 
            : Math.round(((suggestedPrice / costPrice) - 1) * 100);
          
          return { 
            suggestedPrice, 
            markupPercentage: actualMarkupPercent, 
            markupSource: markupPercentage !== null ? markupSource : 'cost_price_minimum'
          };
        }
        
        // AI suggestion is used, but still provide markup info
        // Calculate the implied markup percentage from the AI suggestion
        const impliedMarkup = Math.round(((suggestedPrice / costPrice) - 1) * 100);
        return { 
          suggestedPrice, 
          markupPercentage: impliedMarkup, 
          markupSource: 'ai_suggestion_extracted' 
        };
      } else {
        // If no valid price found, use the category markup
        const suggestedPrice = costPrice * (1 + markupPercentage / 100);
        console.log(`No valid AI price found. Using ${markupSource} markup: ${suggestedPrice.toFixed(2)}`);
        
        return { 
          suggestedPrice, 
          markupPercentage, 
          markupSource 
        };
      }
    }
  } catch (error) {
    console.error('Price suggestion failed:', error);
    
    // Even on error, provide a fallback price using default markup
    const fallbackPrice = costPrice * 1.5; // 50% markup
    return { 
      suggestedPrice: fallbackPrice, 
      markupPercentage: 50, 
      markupSource: 'fallback_on_error' 
    };
  }
}

export async function analyzeProductImage(imageBase64: string): Promise<{
  suggestedName?: string;
  suggestedDescription?: string;
  suggestedCategory?: string;
  suggestedBrand?: string;
  suggestedTags?: string[];
  suggestedCostPrice?: number; 
  suggestedPrice?: number;
}> {
  try {
    let imageData: string;
    
    // Check if imageBase64 is a URL or a base64 string
    if (imageBase64.startsWith('http')) {
      // If it's a URL but we can't process it directly in Gemini
      // We'll need to use text-only prompt and fetch image some other way
      // For now, return a simple object
      console.log("Image URL provided instead of base64, skipping analysis");
      return {
        suggestedName: "",
        suggestedDescription: "",
        suggestedCategory: "",
        suggestedBrand: "",
        suggestedTags: []
      };
    }
    
    try {
      // Extract content type and convert to buffer
      const imageBuffer = base64ToBuffer(imageBase64);
      
      // Resize image to reduce processing time and convert to PNG format
      const resizedImageBuffer = await sharp(imageBuffer)
        .resize({ width: 512, height: 512, fit: 'inside' })
        .png() // Convert to PNG format for consistency
        .toBuffer();
      
      // Create prompt
      imageData = bufferToBase64(resizedImageBuffer, 'image/png');
    } catch (imageError) {
      console.warn('Image processing failed:', imageError);
      return {
        suggestedName: "",
        suggestedDescription: "",
        suggestedCategory: "",
        suggestedBrand: "",
        suggestedTags: []
      };
    }
    
    // Create the generation request
    const result = await geminiProVision.generateContent([
      `Analyze this product image and provide the following details formatted as JSON for a South African e-commerce store:
      1. "name": A concise product name (max 10 words)
      2. "description": A detailed product description (max 100 words)
      3. "category": A single likely product category (e.g., Electronics, Clothing, Home Decor, etc.)
      4. "brand": A likely brand name if visible (otherwise leave blank)
      5. "tags": An array of 5-7 relevant tags (each 1-3 words)
      6. "costPrice": Estimated wholesale/cost price in South African Rand (ZAR)
      7. "price": Suggested retail price in South African Rand (ZAR) with appropriate markup for the South African market
      
      Note: For pricing, be realistic for the South African market where the average monthly income is around 25,000 ZAR.
      Format the response as valid JSON only, with no additional text.`,
      { inlineData: { data: imageData, mimeType: 'image/png' } }
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
        suggestedTags: jsonResponse.tags,
        suggestedCostPrice: jsonResponse.costPrice ? Number(jsonResponse.costPrice) : undefined,
        suggestedPrice: jsonResponse.price ? Number(jsonResponse.price) : undefined
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
            suggestedTags: extractedJson.tags,
            suggestedCostPrice: extractedJson.costPrice ? Number(extractedJson.costPrice) : undefined,
            suggestedPrice: extractedJson.price ? Number(extractedJson.price) : undefined
          };
        } catch (extractError) {
          console.error('Failed to parse extracted JSON:', extractError);
          throw new Error('Failed to parse extracted JSON');
        }
      } else {
        console.error('No valid JSON found in response');
        throw new Error('No valid JSON found in response');
      }
    }
  } catch (error) {
    console.error('Product analysis failed:', error);
    throw new Error('Failed to analyze product image: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}