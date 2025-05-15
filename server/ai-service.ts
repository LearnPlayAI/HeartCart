import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import axios from 'axios';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { temperature: 0.7 } });

/**
 * Helper function to convert image URLs to base64 for Gemini API
 */
async function imageUrlToBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });
    
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting image URL to base64:', error);
    return null;
  }
}

/**
 * Analyzes a product image using Gemini vision capabilities
 */
export async function analyzeProductImage(imageUrl: string): Promise<{
  suggestedKeywords: string[];
  colorPalette: string[];
  detectedObjects: string[];
  styleDescription: string;
  targetAudience: string;
}> {
  try {
    // Convert the image URL to base64 for the Gemini API
    const imageData = await imageUrlToBase64(imageUrl);
    if (!imageData) {
      throw new Error('Failed to process image');
    }

    const promptText = `
    Analyze this product image in detail. Based on what you see, provide the following information:
    
    1. Suggested keywords (5-7 keyword phrases that describe this product)
    2. Color palette (list the main colors visible in the product)
    3. Detected objects (list the main objects or components visible)
    4. Style description (describe the style, design, or aesthetic of the product in 1-2 sentences)
    5. Target audience (who would likely use this product?)
    
    Format your response as a JSON object with these keys: suggestedKeywords (array), colorPalette (array), detectedObjects (array), styleDescription (string), targetAudience (string).
    
    Only return the JSON object without any additional text.`;

    // Create the image part
    const imagePart: Part = {
      inlineData: {
        data: imageData.split(',')[1],
        mimeType: imageData.split(';')[0].split(':')[1]
      }
    };

    // Send request to Gemini with text prompt and image
    const result = await model.generateContent([promptText, imagePart]);
    const text = result.response.text();
    
    try {
      // Extract the JSON object from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        return {
          suggestedKeywords: Array.isArray(analysis.suggestedKeywords) ? analysis.suggestedKeywords : [],
          colorPalette: Array.isArray(analysis.colorPalette) ? analysis.colorPalette : [],
          detectedObjects: Array.isArray(analysis.detectedObjects) ? analysis.detectedObjects : [],
          styleDescription: analysis.styleDescription || '',
          targetAudience: analysis.targetAudience || ''
        };
      }
      
      // Fallback when JSON extraction fails
      return {
        suggestedKeywords: [],
        colorPalette: [],
        detectedObjects: [],
        styleDescription: '',
        targetAudience: ''
      };
    } catch (error) {
      console.error('Error parsing AI image analysis response as JSON:', error);
      throw new Error('Failed to parse image analysis results');
    }
  } catch (error) {
    console.error('Error analyzing product image:', error);
    throw new Error('Failed to analyze product image');
  }
}

/**
 * Generates product description suggestions based on product name, images, and optional category
 */
export async function generateProductDescription(
  productName: string,
  categoryName?: string,
  keyPoints?: string[],
  imageUrls?: string[]
): Promise<string[]> {
  try {
    // Build prompt parts including images if available
    const parts: Part[] = [];
    
    let promptText = `Generate 3 distinct, persuasive, and compelling product descriptions for a South African e-commerce website for: "${productName}"`;
    
    if (categoryName) {
      promptText += ` in the category "${categoryName}"`;
    }
    
    promptText += `. Each description should be between 75-150 words, be search engine optimized, highlight unique selling points, and include emotional appeal.`;
    
    if (keyPoints && keyPoints.length > 0) {
      promptText += ` Focus on these key points: ${keyPoints.join(', ')}.`;
    }

    // Add image analysis if images are provided
    if (imageUrls && imageUrls.length > 0) {
      promptText += ` Use details from the attached product images in your descriptions.`;
      
      // Process up to 3 images maximum to avoid token limits
      const imagesToProcess = imageUrls.slice(0, 3);
      
      // Add the prompt text as the first part
      parts.push({ text: promptText });
      
      // Add each image as a part
      for (const imageUrl of imagesToProcess) {
        if (imageUrl && !imageUrl.includes('undefined')) {
          try {
            const imageData = await imageUrlToBase64(imageUrl);
            if (imageData) {
              parts.push({
                inlineData: {
                  data: imageData.split(',')[1],
                  mimeType: imageData.split(';')[0].split(':')[1]
                }
              });
            }
          } catch (error) {
            console.error(`Error processing image ${imageUrl}:`, error);
            // Continue with other images
          }
        }
      }
      
      // Add formatting instructions as the last part
      parts.push({
        text: `
        Format your response as a JSON array of strings, with each element containing one description.
        Example:
        ["Description 1 text here", "Description 2 text here", "Description 3 text here"]
        
        Do not include any other text or explanation, only the JSON array with 3 descriptions.`
      });
    } else {
      // No images provided, just use text prompt
      promptText += `
      Format your response as a JSON array of strings, with each element containing one description.
      Example:
      ["Description 1 text here", "Description 2 text here", "Description 3 text here"]
      
      Do not include any other text or explanation, only the JSON array with 3 descriptions.`;
      
      parts.push({ text: promptText });
    }

    // Generate content with all the parts
    const result = await model.generateContent(parts);
    const text = result.response.text();
    
    try {
      // Extract the JSON array from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const descriptions = JSON.parse(jsonMatch[0]);
        return Array.isArray(descriptions) ? descriptions : [text];
      }
      return [text];
    } catch (error) {
      console.error('Error parsing AI response as JSON:', error);
      return [text];
    }
  } catch (error) {
    console.error('Error generating product description:', error);
    throw new Error('Failed to generate product descriptions');
  }
}

/**
 * Generates product tags based on product information and optionally images
 */
export async function generateProductTags(
  productName: string,
  productDescription?: string,
  categoryName?: string,
  imageUrls?: string[]
): Promise<string[]> {
  try {
    // Build prompt parts including images if available
    const parts: Part[] = [];
    
    let promptText = `Generate 10-15 relevant, search-optimized tags for a South African e-commerce product: "${productName}"`;
    
    if (categoryName) {
      promptText += ` in the category "${categoryName}"`;
    }
    
    if (productDescription) {
      promptText += `. The product description is: "${productDescription}"`;
    }
    
    // Add image analysis if images are provided
    if (imageUrls && imageUrls.length > 0) {
      promptText += `. Use details from the attached product images to generate relevant tags.`;
      
      // Process up to 2 images maximum to avoid token limits
      const imagesToProcess = imageUrls.slice(0, 2);
      
      // Add the prompt text as the first part
      parts.push({ text: promptText });
      
      // Add each image as a part
      for (const imageUrl of imagesToProcess) {
        if (imageUrl && !imageUrl.includes('undefined')) {
          try {
            const imageData = await imageUrlToBase64(imageUrl);
            if (imageData) {
              parts.push({
                inlineData: {
                  data: imageData.split(',')[1],
                  mimeType: imageData.split(';')[0].split(':')[1]
                }
              });
            }
          } catch (error) {
            console.error(`Error processing image ${imageUrl}:`, error);
            // Continue with other images
          }
        }
      }
      
      // Add formatting instructions as the last part
      parts.push({
        text: `
        The tags should be specific, relevant to South African shoppers, and optimized for search.
        Include a mix of:
        - Product type tags
        - Feature tags
        - Benefit tags
        - Color and material tags (from the images)
        - Occasion tags (if applicable)
        - Seasonal tags (if applicable)
        
        Format your response as a JSON array of strings, with each tag as a separate element.
        Example: ["tag1", "tag2", "tag3", ...]
        
        Do not include any other text or explanation, only the JSON array with tags.`
      });
    } else {
      // No images provided, just use text prompt
      promptText += `
      The tags should be specific, relevant to South African shoppers, and optimized for search.
      Include a mix of:
      - Product type tags
      - Feature tags
      - Benefit tags
      - Occasion tags (if applicable)
      - Seasonal tags (if applicable)
      
      Format your response as a JSON array of strings, with each tag as a separate element.
      Example: ["tag1", "tag2", "tag3", ...]
      
      Do not include any other text or explanation, only the JSON array with tags.`;
      
      parts.push({ text: promptText });
    }

    // Generate content with all the parts
    const result = await model.generateContent(parts);
    const text = result.response.text();
    
    try {
      // Extract the JSON array from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const tags = JSON.parse(jsonMatch[0]);
        return Array.isArray(tags) ? tags : [text];
      }
      return [text];
    } catch (error) {
      console.error('Error parsing AI response as JSON:', error);
      // Extract text as fallback when JSON parsing fails
      const fallbackTags = text.split(',').map(tag => tag.trim());
      return fallbackTags.length > 0 ? fallbackTags : [text];
    }
  } catch (error) {
    console.error('Error generating product tags:', error);
    throw new Error('Failed to generate product tags');
  }
}

/**
 * Generates SEO content for a product with optional image analysis
 */
export async function generateSEO(
  productName: string,
  productDescription: string,
  categoryName: string,
  attributes: any[] = [],
  imageUrls?: string[]
): Promise<{
  title: string;
  description: string;
  keywords: string;
}> {
  try {
    // Build prompt parts including images if available
    const parts: Part[] = [];
    
    // Extract attribute values for context
    const attributeDetails = attributes
      .filter(attr => attr.value && attr.value !== '')
      .map(attr => `${attr.name}: ${attr.value}`)
      .join(', ');
    
    let promptText = `Generate SEO content for a South African e-commerce product: "${productName}"`;
    
    if (categoryName) {
      promptText += ` in the category "${categoryName}"`;
    }
    
    if (productDescription) {
      promptText += `. The product description is: "${productDescription}"`;
    }
    
    if (attributeDetails) {
      promptText += `. The product has these attributes: ${attributeDetails}`;
    }
    
    // Add image analysis if images are provided
    if (imageUrls && imageUrls.length > 0) {
      promptText += `. Use details from the attached product images to enhance SEO content.`;
      
      // Process just 1 image for SEO to avoid token limits
      const imagesToProcess = imageUrls.slice(0, 1);
      
      // Add the prompt text as the first part
      parts.push({ text: promptText });
      
      // Add the image as a part
      for (const imageUrl of imagesToProcess) {
        if (imageUrl && !imageUrl.includes('undefined')) {
          try {
            const imageData = await imageUrlToBase64(imageUrl);
            if (imageData) {
              parts.push({
                inlineData: {
                  data: imageData.split(',')[1],
                  mimeType: imageData.split(';')[0].split(':')[1]
                }
              });
            }
          } catch (error) {
            console.error(`Error processing image ${imageUrl}:`, error);
          }
        }
      }
      
      // Add formatting instructions as the last part
      parts.push({
        text: `
        Generate the following SEO elements tailored for the South African market:
        1. Meta Title (50-60 characters including the product name and main keywords)
        2. Meta Description (EXACTLY 150-160 characters maximum, no more! Include a compelling reason to click and a call to action)
        3. Meta Keywords (10-12 relevant keyword phrases, comma-separated)
        
        Format your response as a single JSON object with the fields: title, description, and keywords.
        Example:
        {
          "title": "Product Name - Key Feature | Brand Name",
          "description": "Shop our [Product Name] with [key benefit]. Perfect for [use case] with [special feature]. Free delivery in South Africa. Shop now & save!",
          "keywords": "product name, key feature, south africa, online shop, best price, category, specific feature, specific benefit"
        }
        
        Do not include any other text or explanation, only the JSON object with the SEO elements.`
      });
    } else {
      // No images provided, just use text prompt
      promptText += `
      Generate the following SEO elements tailored for the South African market:
      1. Meta Title (50-60 characters including the product name and main keywords)
      2. Meta Description (EXACTLY 150-160 characters maximum, no more! Include a compelling reason to click and a call to action)
      3. Meta Keywords (10-12 relevant keyword phrases, comma-separated)
      
      Format your response as a single JSON object with the fields: title, description, and keywords.
      Example:
      {
        "title": "Product Name - Key Feature | Brand Name",
        "description": "Shop our [Product Name] with [key benefit]. Perfect for [use case] with [special feature]. Free delivery in South Africa. Shop now & save!",
        "keywords": "product name, key feature, south africa, online shop, best price, category, specific feature, specific benefit"
      }
      
      Do not include any other text or explanation, only the JSON object with the SEO elements.`;
      
      parts.push({ text: promptText });
    }

    const result = await model.generateContent(parts);
    const text = result.response.text();
    
    try {
      // Extract the JSON object from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const seoContent = JSON.parse(jsonMatch[0]);
        return {
          title: seoContent.title || productName,
          description: seoContent.description ? seoContent.description.slice(0, 160) : `Shop ${productName} online. Fast shipping across South Africa.`.slice(0, 160),
          keywords: seoContent.keywords || productName.toLowerCase()
        };
      }
      
      // Fallback when JSON extraction fails
      return {
        title: `${productName} | Shop Online`,
        description: `Buy ${productName} online. Fast delivery across South Africa.`.slice(0, 160),
        keywords: `${productName.toLowerCase()}, ${categoryName.toLowerCase()}, south africa, shop online`
      };
    } catch (error) {
      console.error('Error parsing AI response as JSON:', error);
      throw new Error('Failed to parse SEO content');
    }
  } catch (error) {
    console.error('Error generating SEO content:', error);
    throw new Error('Failed to generate SEO content');
  }
}

export async function optimizeSEO(
  productName: string,
  productDescription: string,
  categoryName?: string,
  currentTitle?: string | null,
  currentDescription?: string | null,
  currentKeywords?: string[]
): Promise<Array<{
  title: string;
  metaDescription: string;
  keywords: string[];
  score: number;
  tips: string[];
}>> {
  try {
    let promptText = `Generate 3 SEO-optimized metadata suggestions for a South African e-commerce product: "${productName}"`;
    
    if (categoryName) {
      promptText += ` in the category "${categoryName}"`;
    }
    
    if (productDescription) {
      promptText += `. The product description is: "${productDescription}"`;
    }

    if (currentTitle) {
      promptText += `. Current meta title: "${currentTitle}"`;
    }

    if (currentDescription) {
      promptText += `. Current meta description: "${currentDescription}"`;
    }

    if (currentKeywords && currentKeywords.length > 0) {
      promptText += `. Current keywords: ${currentKeywords.join(', ')}`;
    }
    
    promptText += `
    For each suggestion, provide:
    1. Meta Title (50-65 characters, include primary keyword)
    2. Meta Description (EXACTLY 150-160 characters maximum, no more! Include a compelling reason to click and a call to action)
    3. Keywords (10-15 relevant keywords/phrases, comma-separated)
    4. SEO score (0.0-1.0 representing how well optimized this suggestion is)
    5. Tips (2-3 bullet points explaining the strengths of this metadata or how to improve it further)
    
    Format your response as a JSON array with 3 objects, each containing the fields: title, metaDescription, keywords (as array), score, and tips (as array).
    Example:
    [
      {
        "title": "Example Title with Keywords | Brand",
        "metaDescription": "Example description with benefits, features and a call to action. Includes keywords naturally.",
        "keywords": ["keyword1", "keyword2", "keyword phrase", "..."],
        "score": 0.85,
        "tips": ["Tip explanation 1", "Tip explanation 2"]
      },
      {
        "title": "Another Example Title | Brand",
        "metaDescription": "Different description approach focusing on different aspects.",
        "keywords": ["keyword1", "different keyword", "..."],
        "score": 0.9,
        "tips": ["Tip explanation 1", "Different tip 2"]
      },
      {
        "title": "Third Example Title Variation | Brand",
        "metaDescription": "Third variation with different approach.",
        "keywords": ["primary keyword", "different variations", "..."],
        "score": 0.78,
        "tips": ["Different tip 1", "Different tip 2"]
      }
    ]
    
    Do not include any other text or explanation, only the JSON array with 3 suggestions.`;

    const result = await model.generateContent(promptText);
    const text = result.response.text();
    
    try {
      // Extract the JSON array from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          // Validate each suggestion has the required properties
          return suggestions.map(suggestion => ({
            title: suggestion.title || '',
            metaDescription: suggestion.metaDescription || '',
            keywords: Array.isArray(suggestion.keywords) ? suggestion.keywords : [],
            score: typeof suggestion.score === 'number' ? suggestion.score : 0.5,
            tips: Array.isArray(suggestion.tips) ? suggestion.tips : []
          }));
        }
      }
      
      // Fallback: return a default suggestion based on existing data
      return [{
        title: currentTitle || `${productName} | Shop Online`,
        metaDescription: currentDescription || `Buy ${productName} online. Fast delivery across South Africa.`,
        keywords: currentKeywords || [productName.toLowerCase()],
        score: 0.5,
        tips: ['Add more specific keywords', 'Include benefits in description']
      }];
    } catch (error) {
      console.error('Error parsing AI response as JSON:', error);
      throw new Error('Failed to parse SEO optimization suggestions');
    }
  } catch (error) {
    console.error('Error generating SEO optimization:', error);
    throw new Error('Failed to generate SEO optimization suggestions');
  }
}