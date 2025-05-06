import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import sharp from 'sharp';
import { storage } from './storage';
import { InsertAiSetting } from '@shared/schema';

// Environment variable validation
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize the Google Generative AI API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define available Gemini AI models
const AVAILABLE_GEMINI_MODELS = [
  'gemini-1.5-flash',     // Default - fast, cost-effective
  'gemini-1.5-pro',       // Better quality, more expensive
  'gemini-pro-vision',    // Legacy model
  'gemini-pro'            // Text-only model
];

// Key for storing the current model in database
const AI_MODEL_SETTING_KEY = 'current_ai_model';

// Get current model setting or use default
async function getCurrentAiModel(): Promise<string> {
  try {
    const modelSetting = await storage.getAiSetting(AI_MODEL_SETTING_KEY);
    if (modelSetting && AVAILABLE_GEMINI_MODELS.includes(modelSetting.settingValue)) {
      return modelSetting.settingValue;
    }
    return 'gemini-1.5-flash'; // Default model
  } catch (error) {
    console.warn('Error fetching AI model setting, using default:', error);
    return 'gemini-1.5-flash'; // Default model on error
  }
}

// Initialize the Gemini Pro Vision model for image tasks
let geminiProVision: GenerativeModel;

// Default initialization with fallback model
geminiProVision = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Initialize with the saved model (will be updated in the initialize function)
initializeGeminiModel().catch(err => {
  console.error('Error initializing Gemini model:', err);
});

// Function to initialize the model based on saved settings
async function initializeGeminiModel() {
  try {
    // Get the current model from DB or default to gemini-1.5-flash
    const currentModel = await getCurrentAiModel();
    geminiProVision = genAI.getGenerativeModel({ model: currentModel });
    console.log(`Initialized Gemini AI with model: ${currentModel}`);
  } catch (error) {
    console.error('Failed to initialize Gemini model:', error);
    // We already have the fallback model initialized above
    console.log('Using default gemini-1.5-flash model');
  }
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
        // If no valid price found and we have a markup, use it
        if (markupPercentage !== null) {
          const suggestedPrice = costPrice * (1 + markupPercentage / 100);
          console.log(`No valid AI price found. Using ${markupSource} markup: ${suggestedPrice.toFixed(2)}`);
          
          return { 
            suggestedPrice, 
            markupPercentage, 
            markupSource 
          };
        } else {
          // If no markup and no AI price, just use cost price
          console.log(`No valid AI price found and no markup set. Using cost price: ${costPrice.toFixed(2)}`);
          return {
            suggestedPrice: costPrice,
            markupPercentage: 0,
            markupSource: 'cost_price_only'
          };
        }
      }
    }
  } catch (error) {
    console.error('Price suggestion failed:', error);
    
    // Even on error, return cost price as minimum
    return { 
      suggestedPrice: costPrice, 
      markupPercentage: 0, 
      markupSource: 'cost_price_fallback_on_error' 
    };
  }
}

/**
 * Get a list of all available Gemini AI models
 */
export function getAvailableAiModels(): string[] {
  return [...AVAILABLE_GEMINI_MODELS];
}

/**
 * Get currently selected Gemini AI model
 */
export async function getCurrentAiModelSetting(): Promise<{ modelName: string, isDefault: boolean }> {
  const modelName = await getCurrentAiModel();
  const modelSetting = await storage.getAiSetting(AI_MODEL_SETTING_KEY);
  
  return {
    modelName,
    isDefault: !modelSetting // If no setting exists, we're using the default
  };
}

/**
 * Update the current AI model and reinitialize services
 */
export async function updateAiModel(modelName: string): Promise<boolean> {
  try {
    // Verify the model is valid
    if (!AVAILABLE_GEMINI_MODELS.includes(modelName)) {
      throw new Error(`Invalid model name: ${modelName}. Available models: ${AVAILABLE_GEMINI_MODELS.join(', ')}`);
    }
    
    // Save to database
    await storage.saveAiSetting({
      settingName: AI_MODEL_SETTING_KEY,
      settingValue: modelName,
      description: `AI model selected for TeeMeYou AI operations. Selected at ${new Date().toISOString()}`
    });
    
    // Update the current model instance
    try {
      geminiProVision = genAI.getGenerativeModel({ model: modelName });
      console.log(`Successfully updated AI model to: ${modelName}`);
      return true;
    } catch (modelError) {
      console.error(`Error initializing model ${modelName}:`, modelError);
      
      // Fallback to default model if the requested model fails
      geminiProVision = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // Still save the requested model to DB - we'll try it again on next restart
      return false;
    }
  } catch (error) {
    console.error('Failed to update AI model:', error);
    throw new Error('Failed to update AI model: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function analyzeProductImage(imageBase64: string, productName: string): Promise<{
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
      // If it's a URL, we can still process it with the Gemini 1.5 Flash multimodal model
      // by sending the URL directly in the prompt
      console.log("Using image URL directly with Gemini 1.5 multimodal capabilities");
      
      // Create a multimodal request that includes the image URL and product name
      const textResult = await geminiProVision.generateContent([
        {
          text: `Analyze this product (image URL: ${imageBase64}) and provide the following details formatted as JSON for a South African e-commerce store:
          1. "description": A detailed product description (max 100 words) that includes materials, features, and benefits
          2. "category": A single likely product category (e.g., Bedding, Home Decor, Kitchen, etc.)
          3. "brand": A likely brand name based on product type
          4. "tags": An array of 5-7 relevant tags (each 1-3 words)
          5. "costPrice": Estimated wholesale/cost price in South African Rand (ZAR)
          6. "price": Suggested retail price in South African Rand (ZAR) with appropriate markup
          7. "marketResearch": A brief summary of current market prices for similar products in South Africa (3-4 sentences)
          
          The product name is: "${productName}"
          
          Important: Research current market prices for similar products in South Africa to provide realistic price estimates.
          Specifically look at what similar products cost in South African stores like Mr Price Home, Woolworths, @Home, and Takealot.
          
          Format the response as valid JSON only, with no additional text.`
        }
      ]);
      
      const textResponse = await textResult.response;
      const responseText = textResponse.text();
      
      try {
        const jsonResponse = JSON.parse(responseText);
        return {
          suggestedName: productName, // Use the provided product name
          suggestedDescription: jsonResponse.description,
          suggestedCategory: jsonResponse.category,
          suggestedBrand: jsonResponse.brand,
          suggestedTags: jsonResponse.tags,
          suggestedCostPrice: jsonResponse.costPrice ? Number(jsonResponse.costPrice) : undefined,
          suggestedPrice: jsonResponse.price ? Number(jsonResponse.price) : undefined
        };
      } catch (jsonError) {
        console.error('Failed to parse text-only JSON response:', jsonError);
        return {
          suggestedName: productName,
          suggestedDescription: "",
          suggestedCategory: "",
          suggestedBrand: "",
          suggestedTags: []
        };
      }
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
      
      // If image processing fails, fall back to text-only analysis using the product name
      console.log("Falling back to text-only analysis due to image processing failure");
      
      // Create a text-only request using Gemini 1.5 Flash's multimodal capabilities
      const textResult = await geminiProVision.generateContent([
        {
          text: `Analyze this product and provide the following details formatted as JSON for a South African e-commerce store:
          1. "description": A detailed product description (max 100 words) including materials, features, and benefits
          2. "category": A single likely product category (e.g., Bedding, Home Decor, Kitchen, etc.)
          3. "brand": A likely brand name based on product type
          4. "tags": An array of 5-7 relevant tags (each 1-3 words)
          5. "costPrice": Estimated wholesale/cost price in South African Rand (ZAR)
          6. "price": Suggested retail price in South African Rand (ZAR) with appropriate markup
          7. "marketResearch": Brief summary of current market prices for similar products in South Africa (3-4 sentences)
          
          The product name is: "${productName}"
          
          Important: Research current market prices for similar products in South Africa to provide realistic price estimates.
          Specifically look at what similar products cost in South African stores like Mr Price Home, Woolworths, @Home, and Takealot.
          
          Format the response as valid JSON only, with no additional text.`
        }
      ]);
      
      try {
        const textResponse = await textResult.response;
        const responseText = textResponse.text();
        
        const jsonResponse = JSON.parse(responseText);
        return {
          suggestedName: productName,
          suggestedDescription: jsonResponse.description || "",
          suggestedCategory: jsonResponse.category || "",
          suggestedBrand: jsonResponse.brand || "",
          suggestedTags: jsonResponse.tags || [],
          suggestedCostPrice: jsonResponse.costPrice ? Number(jsonResponse.costPrice) : undefined,
          suggestedPrice: jsonResponse.price ? Number(jsonResponse.price) : undefined
        };
      } catch (jsonError) {
        console.error('Failed to parse text-only JSON response:', jsonError);
        // If all else fails, return just the product name as a fallback
        return {
          suggestedName: productName,
          suggestedDescription: "",
          suggestedCategory: "",
          suggestedBrand: "",
          suggestedTags: []
        };
      }
    }
    
    // Create the generation request using multimodal capabilities of Gemini 1.5
    // This will analyze both the image and the text (product name)
    const result = await geminiProVision.generateContent([
      {
        text: `Analyze this product image and provide the following details formatted as JSON for a South African e-commerce store:
        1. "name": A concise product name (max 10 words) - note that the user provided the name "${productName}"
        2. "description": A detailed product description (max 100 words) including material, features, and benefits
        3. "category": A single likely product category (e.g., Bedding, Home Decor, Kitchen, etc.)
        4. "brand": A likely brand name if visible (otherwise suggest a suitable one)
        5. "tags": An array of 5-7 relevant tags (each 1-3 words)
        6. "costPrice": Estimated wholesale/cost price in South African Rand (ZAR)
        7. "price": Suggested retail price in South African Rand (ZAR) with appropriate markup
        8. "marketResearch": Brief summary of current market prices for similar products in South Africa (3-4 sentences)
        
        The product name is: "${productName}"
        
        Important: Research current market prices for similar products in South Africa to provide realistic price estimates.
        Specifically look at what similar products cost in South African stores like Mr Price Home, Woolworths, @Home, and Takealot.
        
        Format the response as valid JSON only, with no additional text.`
      },
      {
        inlineData: { 
          data: imageData, 
          mimeType: 'image/png' 
        }
      }
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