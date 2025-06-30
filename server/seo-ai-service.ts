import { GoogleGenAI } from "@google/genai";
import { Product, Category } from "@shared/schema";
import { storage } from "./storage";

/**
 * SEO AI Service for TeeMeYou.shop
 * Uses Google Gemini AI to enhance product SEO content and keywords
 */

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface SEOEnhancement {
  metaTitle: string;
  metaDescription: string;
  seoKeywords: string[];
  seoSlug: string;
  canonicalUrl: string;
}

export interface SEOAnalysis {
  currentScore: number;
  recommendations: string[];
  missingElements: string[];
  competitorKeywords: string[];
}

class SEOAIService {
  /**
   * Generate SEO-optimized content for a product
   */
  async generateProductSEO(product: Partial<Product>, category?: Partial<Category>): Promise<SEOEnhancement> {
    try {
      const systemPrompt = `You are an SEO expert specializing in South African e-commerce. 
Create SEO-optimized content for products sold in South Africa with PUDO delivery.
Focus on ZAR pricing, local search terms, and South African market preferences.
Respond with JSON in this exact format:
{
  "metaTitle": "string (max 60 chars, include product name and key benefit)",
  "metaDescription": "string (max 160 chars, compelling description with price in ZAR)",
  "seoKeywords": ["keyword1", "keyword2", "keyword3"] (5-8 relevant keywords),
  "seoSlug": "string (URL-friendly slug)",
  "canonicalUrl": "string (full URL path)"
}`;

      const productContext = `
Product Name: ${product.name || 'Unknown Product'}
Description: ${product.description || 'No description'}
Price: R${product.price || 0}
Sale Price: ${product.salePrice ? `R${product.salePrice}` : 'No sale price'}
Category: ${category?.name || 'General'}
Brand: ${product.brand || 'Generic'}
Tags: ${product.tags?.join(', ') || 'None'}
Current Keywords: ${product.seoKeywords?.join(', ') || 'None'}
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              metaTitle: { type: "string" },
              metaDescription: { type: "string" },
              seoKeywords: { 
                type: "array",
                items: { type: "string" }
              },
              seoSlug: { type: "string" },
              canonicalUrl: { type: "string" }
            },
            required: ["metaTitle", "metaDescription", "seoKeywords", "seoSlug", "canonicalUrl"]
          }
        },
        contents: productContext,
      });

      const result = JSON.parse(response.text || '{}') as SEOEnhancement;
      
      // Ensure canonical URL is properly formatted
      result.canonicalUrl = `/product/${result.seoSlug}`;
      
      return result;
    } catch (error) {
      console.error('Failed to generate SEO content:', error);
      
      // Fallback SEO generation
      return this.generateFallbackSEO(product, category);
    }
  }

  /**
   * Analyze current SEO performance and provide recommendations
   */
  async analyzeSEOPerformance(product: Partial<Product>): Promise<SEOAnalysis> {
    try {
      const systemPrompt = `You are an SEO analyst. Analyze the current SEO setup and provide improvement recommendations.
Respond with JSON in this format:
{
  "currentScore": number (0-100),
  "recommendations": ["recommendation1", "recommendation2"],
  "missingElements": ["element1", "element2"],
  "competitorKeywords": ["keyword1", "keyword2"]
}`;

      const seoData = `
Meta Title: ${product.metaTitle || 'Missing'}
Meta Description: ${product.metaDescription || 'Missing'}
Keywords: ${product.seoKeywords?.join(', ') || 'Missing'}
Product Name: ${product.name || 'Unknown'}
Description: ${product.description || 'Missing'}
Price: R${product.price || 0}
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              currentScore: { type: "number" },
              recommendations: { 
                type: "array",
                items: { type: "string" }
              },
              missingElements: { 
                type: "array",
                items: { type: "string" }
              },
              competitorKeywords: { 
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["currentScore", "recommendations", "missingElements", "competitorKeywords"]
          }
        },
        contents: seoData,
      });

      return JSON.parse(response.text || '{}') as SEOAnalysis;
    } catch (error) {
      console.error('Failed to analyze SEO:', error);
      return {
        currentScore: 50,
        recommendations: ["Add meta title", "Improve meta description", "Add relevant keywords"],
        missingElements: ["meta_title", "meta_description", "meta_keywords"],
        competitorKeywords: []
      };
    }
  }

  /**
   * Generate South African market-specific keywords
   */
  async generateLocalKeywords(product: Partial<Product>, category?: Partial<Category>): Promise<string[]> {
    try {
      const prompt = `Generate 10 South African market-specific keywords for this product:
Product: ${product.name}
Category: ${category?.name || 'General'}
Price: R${product.price}

Focus on:
- Local South African terms and slang
- PUDO delivery keywords
- ZAR pricing terms
- Regional preferences
- Mobile shopping terms

Return as a simple JSON array of strings.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: { type: "string" }
          }
        },
        contents: prompt,
      });

      return JSON.parse(response.text || '[]') as string[];
    } catch (error) {
      console.error('Failed to generate local keywords:', error);
      return [
        "south africa",
        "pudo delivery",
        "online shopping sa",
        "free shipping",
        "zar price"
      ];
    }
  }

  /**
   * Update product SEO in database with AI-enhanced content
   */
  async enhanceProductSEO(productId: number): Promise<boolean> {
    try {
      const product = await storage.getProductById(productId);
      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      let category;
      if (product.categoryId) {
        category = await storage.getCategoryById(product.categoryId);
      }

      // Generate AI-enhanced SEO content
      const seoEnhancement = await this.generateProductSEO(product, category);
      const localKeywords = await this.generateLocalKeywords(product, category);

      // Combine AI keywords with local keywords
      const combinedKeywords = [
        ...seoEnhancement.seoKeywords,
        ...localKeywords.slice(0, 3) // Add top 3 local keywords
      ].slice(0, 10); // Limit to 10 keywords

      // Update product with enhanced SEO
      const updateData = {
        metaTitle: seoEnhancement.metaTitle,
        metaDescription: seoEnhancement.metaDescription,
        canonicalUrl: seoEnhancement.canonicalUrl,
        seoSlug: seoEnhancement.seoSlug,
        seoKeywords: combinedKeywords,
        lastModified: new Date().toISOString()
      };

      await storage.updateProduct(productId, updateData);
      
      console.log(`SEO enhanced for product ${productId}: ${product.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to enhance SEO for product ${productId}:`, error);
      return false;
    }
  }

  /**
   * Bulk enhance SEO for multiple products
   */
  async bulkEnhanceSEO(productIds: number[], batchSize: number = 5): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // Process in batches to avoid rate limiting
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (productId) => {
        try {
          const result = await this.enhanceProductSEO(productId);
          return result ? 'success' : 'failed';
        } catch (error) {
          console.error(`Batch SEO enhancement failed for product ${productId}:`, error);
          return 'failed';
        }
      });

      const batchResults = await Promise.all(batchPromises);
      success += batchResults.filter(r => r === 'success').length;
      failed += batchResults.filter(r => r === 'failed').length;

      // Small delay between batches
      if (i + batchSize < productIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { success, failed };
  }

  /**
   * Generate fallback SEO when AI fails
   */
  private generateFallbackSEO(product: Partial<Product>, category?: Partial<Category>): SEOEnhancement {
    const productName = product.name || 'Product';
    const categoryName = category?.name || 'Items';
    const price = product.salePrice || product.price || 0;
    
    const slug = productName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    return {
      metaTitle: `${productName} - ${categoryName} | TeeMeYou.shop`,
      metaDescription: `Buy ${productName} online in South Africa. Starting from R${price}. Fast PUDO delivery available. Shop now at TeeMeYou.shop`,
      seoKeywords: [
        productName.toLowerCase(),
        categoryName.toLowerCase(),
        'south africa',
        'online shopping',
        'pudo delivery'
      ],
      seoSlug: slug,
      canonicalUrl: `/product/${slug}`
    };
  }
}

export const seoAIService = new SEOAIService();