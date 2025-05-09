import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import sharp from 'sharp';
import { storage } from './storage';
import { InsertAiSetting } from '@shared/schema';
import { logger } from './logger';

// Environment variable validation
if (!process.env.GEMINI_API_KEY) {
  logger.error('GEMINI_API_KEY environment variable is required');
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
    logger.warn('Error fetching AI model setting, using default model', {
      error,
      errorType: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      defaultModel: 'gemini-1.5-flash'
    });
    return 'gemini-1.5-flash'; // Default model on error
  }
}

// Initialize the Gemini Pro Vision model for image tasks
let geminiProVision: GenerativeModel;

// Default initialization with fallback model
geminiProVision = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Initialize with the saved model (will be updated in the initialize function)
initializeGeminiModel().catch(err => {
  logger.error('Error initializing Gemini model', {
    error: err,
    errorType: err instanceof Error ? err.name : typeof err,
    errorMessage: err instanceof Error ? err.message : String(err)
  });
});

// Function to initialize the model based on saved settings
async function initializeGeminiModel() {
  try {
    // Get the current model from DB or default to gemini-1.5-flash
    const currentModel = await getCurrentAiModel();
    geminiProVision = genAI.getGenerativeModel({ model: currentModel });
    logger.info(`Initialized Gemini AI with model`, {
      model: currentModel,
      isDefault: currentModel === 'gemini-1.5-flash'
    });
  } catch (error) {
    logger.error('Failed to initialize Gemini model', {
      error,
      errorType: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    // We already have the fallback model initialized above
    logger.info('Using default Gemini model as fallback', {
      model: 'gemini-1.5-flash'
    });
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
 * Safely process an image with robust error handling and format detection
 * Returns a buffer of the processed image or null if processing fails
 */
async function safeImageProcessing(imageBase64: string): Promise<{ dataUri: string, mimeType: string } | null> {
  try {
    // Extract content type and convert to buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    logger.debug('Starting image processing', {
      bufferSize: buffer.length,
      hasValidData: buffer.length > 0
    });
    
    // Try multiple approaches in sequence
    try {
      // First attempt: Process as PNG
      const processedBuffer = await sharp(buffer)
        .resize({ width: 512, height: 512, fit: 'inside' })
        .png()
        .toBuffer();
      
      logger.debug('Successfully processed image as PNG', {
        processedSize: processedBuffer.length,
        dimensions: '512x512'
      });
      
      return {
        dataUri: `data:image/png;base64,${processedBuffer.toString('base64')}`,
        mimeType: 'image/png'
      };
    } catch (pngError) {
      logger.warn('PNG processing failed, trying JPEG format', {
        error: pngError,
        errorType: pngError instanceof Error ? pngError.name : typeof pngError,
        errorMessage: pngError instanceof Error ? pngError.message : String(pngError)
      });
      
      // Second attempt: Process as JPEG
      try {
        const processedBuffer = await sharp(buffer)
          .resize({ width: 512, height: 512, fit: 'inside' })
          .jpeg()
          .toBuffer();
        
        logger.debug('Successfully processed image as JPEG', {
          processedSize: processedBuffer.length,
          dimensions: '512x512'
        });
        
        return {
          dataUri: `data:image/jpeg;base64,${processedBuffer.toString('base64')}`,
          mimeType: 'image/jpeg'
        };
      } catch (jpegError) {
        logger.warn('JPEG processing failed, trying with original format', {
          error: jpegError,
          errorType: jpegError instanceof Error ? jpegError.name : typeof jpegError,
          errorMessage: jpegError instanceof Error ? jpegError.message : String(jpegError)
        });
        
        // Third attempt: Process with original format with minimal transformation
        const metadata = await sharp(buffer).metadata();
        const processedBuffer = await sharp(buffer)
          .resize({ width: 512, height: 512, fit: 'inside' })
          .toBuffer();
        
        logger.debug('Successfully processed image with original format', {
          format: metadata.format || 'unknown',
          processedSize: processedBuffer.length,
          dimensions: '512x512',
          originalWidth: metadata.width,
          originalHeight: metadata.height
        });
        
        return {
          dataUri: `data:image/${metadata.format || 'jpeg'};base64,${processedBuffer.toString('base64')}`,
          mimeType: `image/${metadata.format || 'jpeg'}`
        };
      }
    }
  } catch (error) {
    logger.error('All image processing attempts failed', {
      error,
      errorType: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      inputDataLength: imageBase64 ? imageBase64.length : 0
    });
    return null;
  }
}

/**
 * Process an image to remove its background using Gemini AI
 */
export async function removeImageBackground(imageBase64: string): Promise<string> {
  try {
    // Check if imageBase64 is valid
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      logger.error('Invalid image data provided to background removal', {
        type: typeof imageBase64,
        isEmpty: !imageBase64,
        dataLength: imageBase64 ? imageBase64.length : 0
      });
      throw new Error('Invalid image data provided');
    }
    
    logger.debug('Starting background removal process', {
      dataSize: imageBase64.length,
      isDataUrl: imageBase64.startsWith('data:'),
      aiModel: await getCurrentAiModel()
    });
    
    try {
      // Extract content type and convert to buffer
      const imageBuffer = base64ToBuffer(imageBase64);
      
      // Resize image and convert to PNG for consistency
      try {
        const resizedImageBuffer = await sharp(imageBuffer)
          .resize({ width: 1024, height: 1024, fit: 'inside' })
          .png() // Convert to PNG format for consistency
          .toBuffer();
        
        // Create prompt with image data
        const imageData = bufferToBase64(resizedImageBuffer, 'image/png');
        
        logger.debug('Successfully processed image before background removal', {
          originalSize: imageBuffer.length,
          processedSize: resizedImageBuffer.length,
          resizedDimensions: '1024x1024',
          format: 'png'
        });
        
        try {
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
                logger.info('Successfully removed background from image', {
                  hasResponseData: true,
                  responseSize: part.inlineData.data.length,
                  mimeType: part.inlineData.mimeType
                });
                return part.inlineData.data;
              }
            }
          }
          
          logger.error('No image data in Gemini response', {
            hasResponse: !!response,
            hasCandidates: !!response?.candidates,
            candidateCount: response?.candidates?.length,
            firstCandidateHasParts: !!response?.candidates?.[0]?.content?.parts,
            partsCount: response?.candidates?.[0]?.content?.parts?.length
          });
          
          throw new Error('No processed image was returned from Gemini AI');
        } catch (aiError) {
          logger.error('Error during Gemini AI background removal request', {
            error: aiError,
            errorType: aiError instanceof Error ? aiError.name : typeof aiError,
            errorMessage: aiError instanceof Error ? aiError.message : String(aiError)
          });
          throw aiError; // Re-throw for outer catch
        }
      } catch (imageProcessingError) {
        logger.error('Error processing image for background removal', {
          error: imageProcessingError,
          errorType: imageProcessingError instanceof Error ? imageProcessingError.name : typeof imageProcessingError,
          errorMessage: imageProcessingError instanceof Error ? imageProcessingError.message : String(imageProcessingError),
          bufferSize: imageBuffer ? imageBuffer.length : 0
        });
        throw imageProcessingError; // Re-throw for outer catch
      }
    } catch (bufferError) {
      logger.error('Error converting image data to buffer', {
        error: bufferError,
        errorType: bufferError instanceof Error ? bufferError.name : typeof bufferError,
        errorMessage: bufferError instanceof Error ? bufferError.message : String(bufferError),
        dataLength: imageBase64.length,
        dataFormat: imageBase64.substring(0, 30) + '...'
      });
      throw bufferError; // Re-throw for outer catch
    }
  } catch (error) {
    logger.error('Background removal operation failed', {
      error,
      errorType: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    
    throw new Error('Failed to remove background: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Generate product tags based on image and product information
 */
export async function generateProductTags(
  imageBase64: string, 
  productName: string, 
  productDescription: string,
  productId?: number
): Promise<string[]> {
  try {
    // Input validation
    if (!productName) {
      logger.error('Missing product name for tag generation', {
        hasProductName: !!productName,
        productId,
        descriptionLength: productDescription?.length
      });
      throw new Error('Product name is required for tag generation');
    }

    logger.debug('Starting product tag generation', {
      productId,
      hasImage: !!imageBase64,
      imageType: imageBase64?.startsWith('http') ? 'url' : 'base64',
      productNameLength: productName.length,
      descriptionLength: productDescription?.length,
      aiModel: await getCurrentAiModel()
    });
    
    let imageData: string;
    
    // Check if imageBase64 is a URL or a base64 string
    if (!imageBase64 || imageBase64.startsWith('http')) {
      // If it's a URL or empty, we'll skip image processing and use text-only prompt
      logger.info("Using text-only prompt for tag generation", {
        reason: !imageBase64 ? 'No image provided' : 'URL provided instead of base64',
        productId
      });
      
      try {
        // Generate tags based only on text
        const textOnlyResult = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
          .generateContent([
            `Generate 5-7 relevant product tags for an e-commerce website based on this product information. 
            Focus on features, use cases, materials, style, benefits, and relevant categories.
            Return only the tags in a comma-separated list format, with each tag being 1-3 words maximum.
            
            Product Name: ${productName}
            Product Description: ${productDescription || 'Not provided'}`
          ]);
        
        const textResponse = await textOnlyResult.response;
        const responseText = await textResponse.text();
        
        // Parse comma-separated tags
        const tags = responseText
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag && tag.length > 0);
        
        logger.info('Successfully generated tags using text-only prompt', {
          productId,
          tagCount: tags.length,
          tags: tags.join(', ')
        });
        
        return tags;
      } catch (textPromptError) {
        logger.error('Failed to generate tags with text-only prompt', {
          error: textPromptError,
          errorType: textPromptError instanceof Error ? textPromptError.name : typeof textPromptError,
          errorMessage: textPromptError instanceof Error ? textPromptError.message : String(textPromptError),
          productId
        });
        throw new Error('Failed to generate tags with text prompt: ' + 
          (textPromptError instanceof Error ? textPromptError.message : 'AI service error'));
      }
    }
    
    // Process image if we have a base64 string
    try {
      logger.debug('Processing image for tag generation', {
        productId,
        imageDataSize: imageBase64.length
      });
      
      // Extract content type and convert to buffer
      const imageBuffer = base64ToBuffer(imageBase64);
      
      // Resize image to reduce processing time
      const resizedImageBuffer = await sharp(imageBuffer)
        .resize({ width: 512, height: 512, fit: 'inside' })
        .png() // Convert to PNG format for consistency
        .toBuffer();
      
      // Create prompt with image
      imageData = bufferToBase64(resizedImageBuffer, 'image/png');
      
      logger.debug('Successfully processed image for tag generation', {
        productId,
        originalSize: imageBuffer.length,
        processedSize: resizedImageBuffer.length
      });
    } catch (imageError) {
      logger.warn('Image processing failed for tag generation, falling back to text-only', {
        error: imageError,
        errorType: imageError instanceof Error ? imageError.name : typeof imageError,
        errorMessage: imageError instanceof Error ? imageError.message : String(imageError),
        productId,
        imageDataLength: imageBase64?.length
      });
      
      // Generate tags based only on text as fallback
      try {
        const textOnlyResult = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
          .generateContent([
            `Generate 5-7 relevant product tags for an e-commerce website based on this product information. 
            Focus on features, use cases, materials, style, benefits, and relevant categories.
            Return only the tags in a comma-separated list format, with each tag being 1-3 words maximum.
            
            Product Name: ${productName}
            Product Description: ${productDescription || 'Not provided'}`
          ]);
        
        const textResponse = await textOnlyResult.response;
        const responseText = textResponse.text();
        
        // Parse comma-separated tags
        const tags = responseText
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag && tag.length > 0);
        
        logger.info('Successfully generated tags using text-only fallback', {
          productId,
          tagCount: tags.length,
          tags: tags.join(', '),
          reason: 'Image processing failed'
        });
        
        return tags;
      } catch (fallbackError) {
        logger.error('Both image processing and text fallback failed for tag generation', {
          originalError: imageError,
          fallbackError,
          productId
        });
        throw new Error('Failed to generate tags: Image processing failed and text fallback also failed');
      }
    }
    
    try {
      // Create the generation request with image
      const result = await geminiProVision.generateContent([
        `Generate 5-7 relevant product tags for an e-commerce website based on this product image, name, and description. 
        Focus on features, use cases, materials, style, benefits, and relevant categories.
        Return only the tags in a comma-separated list format, with each tag being 1-3 words maximum.
        
        Product Name: ${productName}
        Product Description: ${productDescription || 'Not provided'}`,
        { inlineData: { data: imageData, mimeType: 'image/png' } }
      ]);
      
      // Get the response
      const response = await result.response;
      const responseText = await response.text();
      
      // Parse comma-separated tags
      const tags = responseText
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag && tag.length > 0);
      
      logger.info('Successfully generated tags with image analysis', {
        productId,
        tagCount: tags.length,
        tags: tags.join(', ')
      });
      
      return tags;
    } catch (aiError) {
      logger.error('AI service failed during image-based tag generation', {
        error: aiError,
        errorType: aiError instanceof Error ? aiError.name : typeof aiError,
        errorMessage: aiError instanceof Error ? aiError.message : String(aiError),
        productId
      });
      
      // Try one more time with text-only as final fallback
      try {
        logger.info('Attempting final text-only fallback for tag generation', { productId });
        
        const textOnlyResult = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
          .generateContent([
            `Generate 5-7 relevant product tags for an e-commerce website based on this product information. 
            Focus on features, use cases, materials, style, benefits, and relevant categories.
            Return only the tags in a comma-separated list format, with each tag being 1-3 words maximum.
            
            Product Name: ${productName}
            Product Description: ${productDescription || 'Not provided'}`
          ]);
        
        const textResponse = await textOnlyResult.response;
        const responseText = textResponse.text();
        
        // Parse comma-separated tags
        const tags = responseText
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag && tag.length > 0);
        
        logger.info('Successfully generated tags using final text-only fallback', {
          productId,
          tagCount: tags.length,
          tags: tags.join(', '),
          reason: 'Image-based generation failed'
        });
        
        return tags;
      } catch (finalFallbackError) {
        logger.error('All tag generation attempts failed', {
          productId,
          imageError: aiError,
          textFallbackError: finalFallbackError
        });
        throw new Error('Failed to generate tags after multiple attempts: ' + 
          (aiError instanceof Error ? aiError.message : 'AI service error'));
      }
    }
  } catch (error) {
    logger.error('Tag generation operation failed', {
      error,
      errorType: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      productId,
      productName
    });
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
    const responseText = await response.text();
    
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
          logger.info(`AI suggested price was below cost price, using category markup instead`, {
            aiSuggestedPrice: jsonResponse.suggestedPrice,
            costPrice,
            markupSource,
            calculatedPrice: suggestedPrice.toFixed(2),
            productName,
            productId: productId || 'unknown'
          });
        } else {
          // If no markup is set, just use cost price as minimum
          suggestedPrice = costPrice;
          useAiSuggestion = false;
          logger.info(`AI suggested price was below cost price with no markup set, using cost price`, {
            aiSuggestedPrice: jsonResponse.suggestedPrice,
            costPrice,
            calculatedPrice: suggestedPrice.toFixed(2),
            productName,
            productId: productId || 'unknown'
          });
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
            logger.info(`AI suggested price from pattern match was below cost price, using category markup`, {
              aiSuggestedPrice: priceMatch[0],
              costPrice,
              markupSource,
              calculatedPrice: suggestedPrice.toFixed(2),
              productName,
              productId: productId || 'unknown'
            });
          } else {
            // If no markup is set, just use cost price as minimum
            suggestedPrice = costPrice;
            useAiSuggestion = false;
            logger.info(`AI suggested price from pattern match was below cost price with no markup, using cost price`, {
              aiSuggestedPrice: priceMatch[0],
              costPrice,
              calculatedPrice: suggestedPrice.toFixed(2),
              productName,
              productId: productId || 'unknown'
            });
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
          logger.info(`No valid AI price found in pattern matching, using category markup`, {
            costPrice,
            markupSource,
            markupPercentage,
            calculatedPrice: suggestedPrice.toFixed(2),
            productName,
            productId: productId || 'unknown'
          });
          
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

export async function analyzeProductImage(imageBase64: string, productName: string, productId?: number): Promise<{
  suggestedName?: string;
  suggestedDescription?: string;
  suggestedCategory?: string;
  suggestedBrand?: string;
  suggestedTags?: string[];
  suggestedCostPrice?: number; 
  suggestedPrice?: number;
  marketResearch?: string;
}> {
  try {
    // Validate inputs
    if (!imageBase64) {
      logger.error('Missing image data for product analysis', {
        productId,
        productName
      });
      throw new Error('Image data is required for product analysis');
    }
    
    if (!productName) {
      logger.error('Missing product name for product analysis', {
        productId,
        hasImage: !!imageBase64
      });
      throw new Error('Product name is required for analysis');
    }
    
    logger.debug('Starting product image analysis', {
      productId,
      productName,
      imageType: imageBase64.startsWith('http') ? 'url' : 'base64',
      aiModel: await getCurrentAiModel()
    });
    
    let imageData: string;
    
    // Check if imageBase64 is a URL or a base64 string
    if (imageBase64.startsWith('http')) {
      try {
        // If it's a URL, we can still process it with the Gemini 1.5 Flash multimodal model
        // by sending the URL directly in the prompt
        logger.info(`Using image URL for product analysis`, {
          productId,
          productName,
          aiModel: await getCurrentAiModel(),
          imageUrlLength: imageBase64.length
        });
        
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
        const responseText = await textResponse.text();
        
        try {
          const jsonResponse = JSON.parse(responseText);
          
          // Validate response structure with detailed logging
          if (!jsonResponse.description) {
            logger.warn(`Missing description in AI analysis for product with URL image`, {
              productId,
              productName
            });
          }
          
          if (!jsonResponse.category) {
            logger.warn(`Missing category in AI analysis for product with URL image`, {
              productId,
              productName
            });
          }
          
          if (!jsonResponse.tags || !Array.isArray(jsonResponse.tags)) {
            logger.warn(`Missing or invalid tags in AI analysis for product with URL image`, {
              productId,
              productName,
              tagsType: typeof jsonResponse.tags,
              hasTagsArray: Array.isArray(jsonResponse.tags)
            });
          }
          
          return {
            suggestedName: productName, // Use the provided product name
            suggestedDescription: jsonResponse.description || "",
            suggestedCategory: jsonResponse.category || "",
            suggestedBrand: jsonResponse.brand || "",
            suggestedTags: Array.isArray(jsonResponse.tags) ? jsonResponse.tags : [],
            suggestedCostPrice: jsonResponse.costPrice ? Number(jsonResponse.costPrice) : undefined,
            suggestedPrice: jsonResponse.price ? Number(jsonResponse.price) : undefined,
            marketResearch: jsonResponse.marketResearch || ""
          };
        } catch (jsonError) {
          logger.error(`Failed to parse URL image JSON response`, {
            error: jsonError,
            errorType: jsonError instanceof Error ? jsonError.name : typeof jsonError, 
            errorMessage: jsonError instanceof Error ? jsonError.message : String(jsonError),
            productId,
            productName,
            responsePreview: responseText.substring(0, 100) + '...'
          });
          
          return {
            suggestedName: productName,
            suggestedDescription: "",
            suggestedCategory: "",
            suggestedBrand: "",
            suggestedTags: []
          };
        }
      } catch (urlAnalysisError) {
        logger.error(`Error analyzing product with URL image`, {
          error: urlAnalysisError,
          errorType: urlAnalysisError instanceof Error ? urlAnalysisError.name : typeof urlAnalysisError,
          errorMessage: urlAnalysisError instanceof Error ? urlAnalysisError.message : String(urlAnalysisError),
          productId,
          productName,
          imageUrlLength: imageBase64.length
        });
        
        throw new Error(`Failed to analyze URL image: ${urlAnalysisError instanceof Error ? urlAnalysisError.message : 'Unknown error'}`);
      }
    }
    
    try {
      // Extract content type and convert to buffer
      logger.info(`Processing image data for product analysis`, {
        productId,
        productName,
        imageDataLength: imageBase64.length
      });
      
      const imageBuffer = base64ToBuffer(imageBase64);
      
      // Resize image to reduce processing time and convert to PNG format
      const resizedImageBuffer = await sharp(imageBuffer)
        .resize({ width: 512, height: 512, fit: 'inside' })
        .png() // Convert to PNG format for consistency
        .toBuffer();
      
      // Create prompt
      imageData = bufferToBase64(resizedImageBuffer, 'image/png');
      
      logger.info(`Successfully processed image for product analysis`, {
        productId,
        productName,
        originalSize: imageBase64.length,
        processedSize: imageData.length
      });
    } catch (imageError) {
      logger.error(`Image processing failed for product analysis`, {
        error: imageError,
        errorType: imageError instanceof Error ? imageError.name : typeof imageError,
        errorMessage: imageError instanceof Error ? imageError.message : String(imageError),
        productId,
        productName,
        imageDataLength: imageBase64 ? imageBase64.length : 0
      });
      
      // If image processing fails, fall back to text-only analysis using the product name
      logger.info(`Falling back to text-only analysis for product due to image processing failure`, {
        productId,
        productName
      });
      
      try {
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
          const responseText = await textResponse.text();
          
          const jsonResponse = JSON.parse(responseText);
          
          // Validate response structure with detailed logging
          if (!jsonResponse.description) {
            logger.warn(`Missing description in text-only AI analysis for product`, {
              productId,
              productName
            });
          }
          
          if (!jsonResponse.category) {
            logger.warn(`Missing category in text-only AI analysis for product`, {
              productId,
              productName
            });
          }
          
          if (!jsonResponse.tags || !Array.isArray(jsonResponse.tags)) {
            logger.warn(`Missing or invalid tags in text-only AI analysis for product`, {
              productId,
              productName,
              tagsType: typeof jsonResponse.tags,
              hasTagsArray: Array.isArray(jsonResponse.tags)
            });
          }
          
          return {
            suggestedName: productName,
            suggestedDescription: jsonResponse.description || "",
            suggestedCategory: jsonResponse.category || "",
            suggestedBrand: jsonResponse.brand || "",
            suggestedTags: Array.isArray(jsonResponse.tags) ? jsonResponse.tags : [],
            suggestedCostPrice: jsonResponse.costPrice ? Number(jsonResponse.costPrice) : undefined,
            suggestedPrice: jsonResponse.price ? Number(jsonResponse.price) : undefined,
            marketResearch: jsonResponse.marketResearch || ""
          };
        } catch (jsonError) {
          logger.error(`Failed to parse text-only fallback JSON response`, {
            error: jsonError,
            errorType: jsonError instanceof Error ? jsonError.name : typeof jsonError,
            errorMessage: jsonError instanceof Error ? jsonError.message : String(jsonError),
            productId,
            productName,
            responsePreview: responseText?.substring(0, 100) + '...'
          });
          
          // If all else fails, return just the product name as a fallback
          return {
            suggestedName: productName,
            suggestedDescription: "",
            suggestedCategory: "",
            suggestedBrand: "",
            suggestedTags: []
          };
        }
      } catch (textAnalysisError) {
        logger.error(`Error in text-only analysis fallback`, {
          error: textAnalysisError,
          errorType: textAnalysisError instanceof Error ? textAnalysisError.name : typeof textAnalysisError,
          errorMessage: textAnalysisError instanceof Error ? textAnalysisError.message : String(textAnalysisError),
          productId,
          productName
        });
        
        throw new Error(`Failed to analyze product via text-only fallback: ${textAnalysisError instanceof Error ? textAnalysisError.message : 'Unknown model error'}`);
      }
    }
    
    try {
      // Create the generation request using multimodal capabilities of Gemini 1.5
      // This will analyze both the image and the text (product name)
      logger.info(`Making multimodal Gemini AI request for product analysis`, {
        productId,
        productName,
        imageDataSize: imageData.length
      });
      
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
      // Use await when calling response.text() as it returns a Promise
      const responseText = await response.text(); // This contains the text response directly
      
      // Parse JSON response
      try {
        // First, try to parse the response as-is
        logger.info(`Received AI response for product analysis, attempting to parse JSON`, {
          productId, 
          productName,
          responseLength: responseText.length
        });
        
        const jsonResponse = JSON.parse(responseText);
        
        // Validate response structure with detailed logging
        if (!jsonResponse.name) {
          logger.warn(`Missing name in AI analysis result`, {
            productId,
            productName,
            responseKeys: Object.keys(jsonResponse)
          });
        }
        
        if (!jsonResponse.description) {
          logger.warn(`Missing description in AI analysis result`, {
            productId,
            productName,
            responseKeys: Object.keys(jsonResponse)
          });
        }
        
        if (!jsonResponse.category) {
          logger.warn(`Missing category in AI analysis result`, {
            productId,
            productName,
            responseKeys: Object.keys(jsonResponse)
          });
        }
        
        if (!jsonResponse.tags || !Array.isArray(jsonResponse.tags)) {
          logger.warn(`Missing or invalid tags in AI analysis result`, {
            productId,
            productName,
            tagsType: typeof jsonResponse.tags,
            hasTagsArray: Array.isArray(jsonResponse.tags),
            responseKeys: Object.keys(jsonResponse)
          });
        }
        
        return {
          suggestedName: jsonResponse.name || productName,
          suggestedDescription: jsonResponse.description || "",
          suggestedCategory: jsonResponse.category || "",
          suggestedBrand: jsonResponse.brand || "",
          suggestedTags: Array.isArray(jsonResponse.tags) ? jsonResponse.tags : [],
          suggestedCostPrice: jsonResponse.costPrice ? Number(jsonResponse.costPrice) : undefined,
          suggestedPrice: jsonResponse.price ? Number(jsonResponse.price) : undefined,
          marketResearch: jsonResponse.marketResearch || ""
        };
      } catch (jsonError) {
        // If direct parsing fails, try to extract JSON from the text
        logger.error(`Failed to parse JSON response`, {
          error: jsonError,
          errorType: jsonError instanceof Error ? jsonError.name : typeof jsonError,
          errorMessage: jsonError instanceof Error ? jsonError.message : String(jsonError),
          productId,
          productName,
          responseLength: responseText.length
        });
        
        logger.info(`Attempting to extract JSON from raw text response`, {
          productId,
          productName
        });
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          try {
            const extractedJson = JSON.parse(jsonStr);
            
            logger.info(`Successfully extracted and parsed JSON from text response`, {
              productId,
              productName,
              extractedJsonLength: jsonStr.length,
              extractedKeys: Object.keys(extractedJson)
            });
            
            return {
              suggestedName: extractedJson.name || productName,
              suggestedDescription: extractedJson.description || "",
              suggestedCategory: extractedJson.category || "",
              suggestedBrand: extractedJson.brand || "",
              suggestedTags: Array.isArray(extractedJson.tags) ? extractedJson.tags : [],
              suggestedCostPrice: extractedJson.costPrice ? Number(extractedJson.costPrice) : undefined,
              suggestedPrice: extractedJson.price ? Number(extractedJson.price) : undefined,
              marketResearch: extractedJson.marketResearch || ""
            };
          } catch (extractError) {
            logger.error(`Failed to parse extracted JSON pattern`, {
              error: extractError,
              errorType: extractError instanceof Error ? extractError.name : typeof extractError,
              errorMessage: extractError instanceof Error ? extractError.message : String(extractError),
              productId,
              productName,
              extractedJsonLength: jsonStr.length,
              extractedSample: jsonStr.substring(0, 100) + '...'
            });
            
            throw new Error(`Failed to parse extracted JSON: ${extractError instanceof Error ? extractError.message : 'Unknown parsing error'}`);
          }
        } else {
          logger.error(`No valid JSON pattern found in AI response`, {
            productId,
            productName,
            responseLength: responseText.length,
            responseSample: responseText.substring(0, 100) + '...'
          });
          
          throw new Error(`No valid JSON found in AI response for product "${productName}"`);
        }
      }
    } catch (aiRequestError) {
      logger.error(`AI request failed`, {
        error: aiRequestError,
        errorType: aiRequestError instanceof Error ? aiRequestError.name : typeof aiRequestError,
        errorMessage: aiRequestError instanceof Error ? aiRequestError.message : String(aiRequestError),
        productId,
        productName,
        model: await getCurrentAiModel()
      });
      
      throw new Error(`AI analysis request failed: ${aiRequestError instanceof Error ? aiRequestError.message : 'Unknown AI processing error'}`);
    }
  } catch (error) {
    logger.error(`Product analysis failed`, {
      error,
      errorType: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      productId,
      productName,
      model: await getCurrentAiModel().catch(() => 'unknown')
    });
    
    throw new Error('Failed to analyze product image: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}