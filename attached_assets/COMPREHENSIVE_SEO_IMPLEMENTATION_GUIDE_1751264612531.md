
# Comprehensive SEO Implementation Guide for teemeyou.shop

## Overview

This guide provides a complete blueprint for implementing enterprise-level SEO optimization based on a proven marketplace architecture. The system includes AI-powered content generation, async processing, comprehensive meta tags, structured data, and PWA optimization.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema Extensions](#database-schema-extensions)
3. [Core SEO Services](#core-seo-services)
4. [API Routes Implementation](#api-routes-implementation)
5. [Frontend SEO Hooks](#frontend-seo-hooks)
6. [Server-Side Rendering](#server-side-rendering)
7. [Sitemap and Robots.txt](#sitemap-and-robots-txt)
8. [Async SEO Processing](#async-seo-processing)
9. [PWA SEO Integration](#pwa-seo-integration)
10. [Testing and Verification](#testing-and-verification)

## Architecture Overview

The SEO system consists of several interconnected components:

- **AI-Powered Content Generation**: Using Google Gemini for meta titles, descriptions, and keywords
- **Async Processing Queue**: Background SEO generation to avoid blocking user operations
- **Server-Side Rendering**: Complete HTML pages for search engine crawlers
- **Dynamic Meta Tags**: Real-time Open Graph and Twitter Card generation
- **Structured Data**: JSON-LD schema markup for rich snippets
- **Comprehensive Sitemaps**: Dynamic XML sitemaps with product metadata

## Database Schema Extensions

### Products Table SEO Fields

Add these fields to your existing `products` table:

```sql
-- SEO Fields for products table
ALTER TABLE products ADD COLUMN meta_title VARCHAR(60);
ALTER TABLE products ADD COLUMN meta_description VARCHAR(160);
ALTER TABLE products ADD COLUMN seo_keywords TEXT[]; -- PostgreSQL array or JSON for other DBs
ALTER TABLE products ADD COLUMN seo_slug VARCHAR(255);
ALTER TABLE products ADD COLUMN canonical_url VARCHAR(500);

-- Indexes for SEO performance
CREATE INDEX idx_products_seo_slug ON products(seo_slug);
CREATE INDEX idx_products_meta_title ON products(meta_title);
```

### AI Interaction Logging (Optional)

```sql
CREATE TABLE ai_interactions (
    id SERIAL PRIMARY KEY,
    request_type VARCHAR(50) NOT NULL,
    user_prompt TEXT,
    ai_response TEXT,
    confidence_score DECIMAL(3,2),
    environment VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Core SEO Services

### 1. SEO Service with AI Integration

Create `server/seoService.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI (replace with your preferred AI service)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

export interface SEOOptimization {
  metaTitle: string;
  metaDescription: string;
  seoKeywords: string[];
  seoSlug: string;
  canonicalUrl: string;
}

class SEOService {
  /**
   * Generate SEO-optimized fields for a product using AI
   */
  async generateProductSEO(
    title: string,
    description: string,
    price: number,
    condition: string,
    categoryName: string,
    location: string,
    productId: number,
    environment: string = 'prod'
  ): Promise<SEOOptimization> {
    try {
      const prompt = `Generate SEO-optimized fields for an e-commerce marketplace product:

Product Details:
- Title: ${title}
- Description: ${description}
- Price: $${price.toLocaleString()}
- Condition: ${condition}
- Category: ${categoryName}
- Location: ${location}
- Product ID: ${productId}

Target Market: Online marketplace shoppers, price-conscious consumers, local buyers

Generate JSON with these fields:
{
  "metaTitle": "SEO-optimized page title (max 60 chars) including price and condition",
  "metaDescription": "Compelling meta description (max 160 chars) with key selling points",
  "seoKeywords": ["array", "of", "relevant", "keywords", "for", "marketplace", "search"],
  "seoSlug": "url-friendly-slug-with-product-id"
}

Requirements:
- Include location or "online marketplace" in keywords
- Include condition (new/used) in meta title
- Include price in meta description
- Keywords should target marketplace shoppers, bargain hunters
- Slug should be URL-friendly and include product ID
- Focus on conversion-oriented language`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Parse AI response
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const seoData = JSON.parse(cleanedText);
      
      // Ensure slug includes product ID for uniqueness
      const baseSlug = seoData.seoSlug || title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      
      const finalSlug = `${baseSlug}-${productId}`;
      
      return {
        metaTitle: seoData.metaTitle.substring(0, 60),
        metaDescription: seoData.metaDescription.substring(0, 160),
        seoKeywords: Array.isArray(seoData.seoKeywords) ? seoData.seoKeywords : [],
        seoSlug: finalSlug,
        canonicalUrl: `https://teemeyou.shop/product/${productId}`
      };
      
    } catch (error) {
      console.error('SEO generation error:', error);
      
      // Fallback SEO generation
      const fallbackSlug = title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50) + `-${productId}`;
      
      return {
        metaTitle: `${title} - ${condition} $${price.toLocaleString()} | TeeMeYou`,
        metaDescription: `${condition === 'new' ? 'New' : 'Quality used'} ${title} for $${price.toLocaleString()}. ${description.substring(0, 80)}... Shop on TeeMeYou.shop`,
        seoKeywords: ['marketplace', 'online shopping', condition, categoryName.toLowerCase()],
        seoSlug: fallbackSlug,
        canonicalUrl: `https://teemeyou.shop/product/${productId}`
      };
    }
  }

  /**
   * Generate fallback SEO fields without AI
   */
  generateFallbackSEO(
    title: string,
    description: string,
    price: number,
    condition: string,
    categoryName: string,
    location: string,
    productId: number
  ): SEOOptimization {
    const fallbackSlug = title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50) + `-${productId}`;
    
    const locationText = location ? ` in ${location}` : ' online';
    const conditionText = condition === 'new' ? 'New' : 'Quality used';
    
    return {
      metaTitle: `${title} - ${conditionText} $${price.toLocaleString()}${locationText}`.substring(0, 60),
      metaDescription: `${conditionText} ${title} for $${price.toLocaleString()}${locationText}. ${description.substring(0, 80)}... Shop at TeeMeYou.shop`,
      seoKeywords: [
        'marketplace',
        'online shopping',
        'teemeyou',
        condition,
        categoryName.toLowerCase(),
        ...(location ? [location.toLowerCase()] : [])
      ],
      seoSlug: fallbackSlug,
      canonicalUrl: `https://teemeyou.shop/product/${productId}`
    };
  }
}

export const seoService = new SEOService();
```

### 2. Async SEO Processing Service

Create `server/asyncSeoService.ts`:

```typescript
interface AsyncSEOTask {
  productId: number;
  environment: string;
  userId?: number;
  userEmail?: string;
  userRole?: string;
  priority: 'high' | 'normal' | 'low';
}

class AsyncSeoService {
  private processingQueue: AsyncSEOTask[] = [];
  private isProcessing = false;
  private readonly BATCH_SIZE = 5;
  private readonly PROCESSING_DELAY = 2000; // 2 seconds between batches

  /**
   * Queue a product for asynchronous SEO generation
   */
  async queueSEOGeneration(task: AsyncSEOTask): Promise<void> {
    console.log(`[AsyncSEO] Queuing SEO generation for product ${task.productId}`);
    
    // Add to queue with priority ordering
    if (task.priority === 'high') {
      this.processingQueue.unshift(task);
    } else {
      this.processingQueue.push(task);
    }

    // Start processing if not already running
    if (!this.isProcessing) {
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Process the SEO generation queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`[AsyncSEO] Starting queue processing with ${this.processingQueue.length} tasks`);

    try {
      while (this.processingQueue.length > 0) {
        const batch = this.processingQueue.splice(0, this.BATCH_SIZE);
        console.log(`[AsyncSEO] Processing batch of ${batch.length} SEO tasks`);

        // Process batch in parallel
        const batchPromises = batch.map(task => this.processSingleSEOTask(task));
        const results = await Promise.allSettled(batchPromises);

        // Log results
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            console.log(`[AsyncSEO] ✓ Task ${batch[index].productId} completed successfully`);
          } else {
            console.error(`[AsyncSEO] ✗ Task ${batch[index].productId} failed:`, result.reason);
          }
        });

        // Delay between batches to prevent overwhelming the system
        if (this.processingQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, this.PROCESSING_DELAY));
        }
      }
    } catch (error) {
      console.error('[AsyncSEO] Queue processing error:', error);
    } finally {
      this.isProcessing = false;
      console.log('[AsyncSEO] Queue processing completed');
    }
  }

  /**
   * Process a single SEO task
   */
  private async processSingleSEOTask(task: AsyncSEOTask): Promise<void> {
    try {
      // Get product data from database
      const product = await this.getProductById(task.productId);
      
      if (!product) {
        throw new Error(`Product ${task.productId} not found`);
      }

      // Check if SEO fields already exist
      if (product.metaTitle && product.metaDescription && product.seoKeywords && product.seoSlug) {
        console.log(`[AsyncSEO] Product ${task.productId} already has SEO data, skipping`);
        return;
      }

      // Generate SEO data
      const seoData = await seoService.generateProductSEO(
        product.title,
        product.description || '',
        product.price,
        product.condition || 'used',
        product.category?.name || 'General',
        product.location || '',
        product.id,
        task.environment
      );

      // Update database
      await this.updateProductSEO(task.productId, seoData);
      
      console.log(`[AsyncSEO] Generated SEO for product ${task.productId}: "${seoData.metaTitle}"`);
      
    } catch (error) {
      console.error(`[AsyncSEO] Error processing product ${task.productId}:`, error);
      throw error;
    }
  }

  /**
   * Get current queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing,
      nextTasks: this.processingQueue.slice(0, 5).map(task => ({
        productId: task.productId,
        priority: task.priority
      }))
    };
  }

  // Database helper methods (implement based on your ORM/database setup)
  private async getProductById(id: number) {
    // Implement based on your database setup
    // Return product with category and other related data
  }

  private async updateProductSEO(productId: number, seoData: SEOOptimization) {
    // Implement based on your database setup
    // Update the product with SEO fields
  }
}

export const asyncSeoService = new AsyncSeoService();
```

## API Routes Implementation

### 1. SEO Routes

Create `server/routes/seo.ts`:

```typescript
import { Router } from 'express';

const router = Router();

/**
 * Enhanced robots.txt for marketplace SEO
 */
router.get('/robots.txt', async (req, res) => {
  const robotsContent = `User-agent: *
Allow: /

# Important pages for indexing
Allow: /
Allow: /product/*
Allow: /category/*
Allow: /search*

# Sitemap location
Sitemap: https://teemeyou.shop/sitemap.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1

# Block admin and auth pages
Disallow: /api/
Disallow: /admin/
Disallow: /auth/

# Marketplace targeting - Welcome Google
# Target keywords: marketplace, online shopping, deals, bargains
# Geographic focus: Global marketplace`;

  res.setHeader('Content-Type', 'text/plain');
  res.send(robotsContent);
});

/**
 * Enhanced sitemap.xml with rich product data
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    // Get all active products
    const products = await getActiveProducts(); // Implement based on your database
    
    const baseUrl = 'https://teemeyou.shop';
    const now = new Date().toISOString();
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Homepage - High priority -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Browse page -->
  <url>
    <loc>${baseUrl}/browse</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Sell page -->
  <url>
    <loc>${baseUrl}/sell</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

    // Add each product with rich SEO data
    for (const product of products) {
      const productUrl = `${baseUrl}/product/${product.id}`;
      const imageUrl = product.primaryImage ? 
        `${baseUrl}/api/files/${product.primaryImage}` : 
        `${baseUrl}/icon-192.svg`;
      
      const description = product.description ? 
        product.description.substring(0, 160).replace(/[&<>"']/g, (char) => {
          const entities: Record<string, string> = {
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
          };
          return entities[char] || char;
        }) : 
        `${product.title} for $${product.price} in ${product.condition} condition`;

      sitemap += `
  
  <!-- Product: ${product.title} -->
  <url>
    <loc>${productUrl}</loc>
    <lastmod>${product.updatedAt ? new Date(product.updatedAt).toISOString() : now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:caption>${product.title} - $${product.price}</image:caption>
      <image:title>${product.title}</image:title>
    </image:image>
  </url>`;
    }

    sitemap += `
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.send(sitemap);

  } catch (error) {
    console.error('Sitemap generation error:', error);
    
    // Fallback minimal sitemap
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://teemeyou.shop/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.send(fallbackSitemap);
  }
});

export default router;
```

### 2. Product SEO Routes

Create `server/routes/product-seo.ts`:

```typescript
import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/seo/product/:id
 * Returns SEO metadata for a product - publicly accessible
 */
router.get('/product/:id', async (req: Request, res: Response): Promise<void> => {
  const productId = parseInt(req.params.id);
  
  if (isNaN(productId)) {
    res.status(400).json({ success: false, error: 'Invalid product ID' });
    return;
  }

  try {
    // Get product data
    const product = await getProductById(productId); // Implement based on your database
    
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    // Generate SEO metadata
    const baseUrl = 'https://teemeyou.shop';
    const productUrl = `${baseUrl}/product/${productId}`;
    const imageUrl = product.primaryImage ? `${baseUrl}/api/files/${product.primaryImage}` : `${baseUrl}/icon-192.svg`;
    
    const seoMetadata = {
      title: `${product.title} - $${product.price.toLocaleString()} | TeeMeYou`,
      description: product.description ? product.description.substring(0, 160) + '...' : `${product.title} for $${product.price}`,
      canonicalUrl: productUrl,
      keywords: product.seoKeywords || ['marketplace', 'online shopping', product.condition, product.category?.name].filter(Boolean),
      openGraph: {
        title: `${product.title} - $${product.price.toLocaleString()} | TeeMeYou`,
        description: `${product.title} for $${product.price.toLocaleString()} | ${product.condition || 'good condition'} | Shop on TeeMeYou marketplace`,
        image: imageUrl,
        url: productUrl,
        type: 'product',
        siteName: 'TeeMeYou',
        locale: 'en_US'
      },
      twitter: {
        card: 'summary_large_image',
        title: `${product.title} - $${product.price.toLocaleString()} | TeeMeYou`,
        description: `${product.title} for $${product.price.toLocaleString()} | ${product.condition || 'good condition'}`,
        image: imageUrl
      },
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description: product.description,
        image: [imageUrl],
        offers: {
          '@type': 'Offer',
          price: product.price.toString(),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          itemCondition: `https://schema.org/${product.condition === 'new' ? 'NewCondition' : 'UsedCondition'}`
        },
        seller: {
          '@type': 'Organization',
          name: product.seller?.name || 'TeeMeYou Seller'
        },
        category: product.category?.name || 'General'
      }
    };

    res.json({ success: true, data: seoMetadata });

  } catch (error) {
    console.error('SEO endpoint error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate SEO metadata' });
  }
});

export default router;
```

### 3. Async SEO Routes

Create `server/routes/async-seo.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { asyncSeoService } from '../asyncSeoService';

const router = Router();

/**
 * POST /api/async-seo/queue/:productId
 * Queue a product for asynchronous SEO generation
 */
router.post('/queue/:productId', async (req: Request, res: Response): Promise<void> => {
  const productId = parseInt(req.params.productId);
  if (isNaN(productId)) {
    res.status(400).json({ error: 'Invalid product ID' });
    return;
  }

  const { priority = 'normal' } = req.body;
  
  try {
    await asyncSeoService.queueSEOGeneration({
      productId,
      environment: 'production',
      userId: req.user?.id || 1, // System user
      userEmail: req.user?.email || 'system@teemeyou.shop',
      userRole: 'admin',
      priority
    });

    res.json({
      success: true,
      message: 'SEO generation queued successfully',
      productId,
      priority,
      queueStatus: asyncSeoService.getQueueStatus()
    });
  } catch (error) {
    console.error('[AsyncSEO API] Error queuing SEO generation:', error);
    res.status(500).json({
      error: 'Failed to queue SEO generation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/async-seo/status
 * Get current SEO generation queue status
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = asyncSeoService.getQueueStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('[AsyncSEO API] Error getting queue status:', error);
    res.status(500).json({
      error: 'Failed to get queue status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
```

## Frontend SEO Hooks

### React SEO Hook

Create `client/src/hooks/useSEO.tsx`:

```typescript
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface SEOMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  keywords: string[];
  openGraph: {
    title: string;
    description: string;
    image?: string;
    url: string;
    type: string;
    siteName: string;
    locale: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
    image?: string;
  };
  structuredData: any;
}

/**
 * Hook to fetch and apply SEO metadata for product pages
 */
export function useProductSEO(productId: number | null) {
  const queryClient = useQueryClient();

  // Fetch SEO metadata for the product
  const { data: seoData, isLoading, error } = useQuery({
    queryKey: ['/api/seo/product', productId],
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Apply SEO metadata to document head
  useEffect(() => {
    if (!seoData?.success || !seoData.data) return;

    const metadata: SEOMetadata = seoData.data;

    // Update document title
    document.title = metadata.title;

    // Update or create meta tags
    updateMetaTag('description', metadata.description);
    updateMetaTag('keywords', metadata.keywords.join(', '));
    
    // Canonical URL
    updateLinkTag('canonical', metadata.canonicalUrl);

    // Open Graph tags
    updateMetaProperty('og:title', metadata.openGraph.title);
    updateMetaProperty('og:description', metadata.openGraph.description);
    updateMetaProperty('og:url', metadata.openGraph.url);
    updateMetaProperty('og:type', metadata.openGraph.type);
    updateMetaProperty('og:site_name', metadata.openGraph.siteName);
    updateMetaProperty('og:locale', metadata.openGraph.locale);
    
    if (metadata.openGraph.image) {
      updateMetaProperty('og:image', metadata.openGraph.image);
    }

    // Twitter Card tags
    updateMetaName('twitter:card', metadata.twitter.card);
    updateMetaName('twitter:title', metadata.twitter.title);
    updateMetaName('twitter:description', metadata.twitter.description);
    
    if (metadata.twitter.image) {
      updateMetaName('twitter:image', metadata.twitter.image);
    }

    // Structured data for Google
    updateStructuredData(metadata.structuredData);

    // Cleanup function
    return () => {
      document.title = 'TeeMeYou.shop - Your Online Marketplace';
      restoreDefaultMetaTags();
    };
  }, [seoData]);

  return {
    seoData: seoData?.data,
    isLoading,
    error
  };
}

/**
 * Hook for homepage and static pages SEO
 */
export function useStaticPageSEO(pageData: {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  keywords?: string[];
}) {
  useEffect(() => {
    if (pageData.title) {
      document.title = pageData.title;
    }

    if (pageData.description) {
      updateMetaTag('description', pageData.description);
    }

    if (pageData.canonicalUrl) {
      updateLinkTag('canonical', pageData.canonicalUrl);
    }

    if (pageData.keywords) {
      updateMetaTag('keywords', pageData.keywords.join(', '));
    }

    // Robots meta for indexing
    updateMetaName('robots', 'index, follow');

    return () => {
      restoreDefaultMetaTags();
    };
  }, [pageData]);
}

// Helper functions for DOM manipulation
function updateMetaTag(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  
  meta.content = content;
}

function updateMetaProperty(property: string, content: string) {
  let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
  
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  
  meta.content = content;
}

function updateMetaName(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  
  meta.content = content;
}

function updateLinkTag(rel: string, href: string) {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  
  link.href = href;
}

function updateStructuredData(data: any) {
  // Remove existing structured data
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }

  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

function restoreDefaultMetaTags() {
  updateMetaTag('description', 'TeeMeYou.shop - Your trusted online marketplace for quality products at great prices. Buy and sell with confidence.');
  updateMetaTag('keywords', 'marketplace, online shopping, deals, bargains, buy, sell, teemeyou');
  updateLinkTag('canonical', 'https://teemeyou.shop/');
  
  // Remove product-specific tags
  const ogTags = document.querySelectorAll('meta[property^="og:"]');
  ogTags.forEach(tag => {
    if (!['og:site_name', 'og:locale'].includes(tag.getAttribute('property') || '')) {
      tag.remove();
    }
  });
  
  const twitterTags = document.querySelectorAll('meta[name^="twitter:"]');
  twitterTags.forEach(tag => tag.remove());
  
  const structuredData = document.querySelector('script[type="application/ld+json"]');
  if (structuredData) {
    structuredData.remove();
  }
}
```

## Server-Side Rendering for SEO

### SSR Page Generator

Create `server/seoPageGenerator.ts`:

```typescript
/**
 * SEO Page Generator - Server-Side Rendering for Product Pages
 * Generates complete HTML pages with Open Graph, JSON-LD, and meta tags
 */

export async function generateProductPage(productId: number): Promise<string | null> {
  try {
    // Get product details
    const product = await getProductById(productId); // Implement based on your database
    if (!product) return null;

    // Get seller and category details
    const seller = await getUserById(product.sellerId);
    const category = await getCategoryById(product.categoryId);

    // Determine primary image URL
    const primaryImageUrl = product.primaryImage ? 
      `https://teemeyou.shop/api/files/${product.primaryImage}` : 
      'https://teemeyou.shop/icon-192.svg';

    // Format price for display
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(product.price);

    return generateHTML({
      product,
      seller,
      category,
      primaryImageUrl,
      formattedPrice
    });
  } catch (error) {
    console.error('Error generating product page:', error);
    return null;
  }
}

/**
 * Generate the complete HTML with all SEO elements
 */
function generateHTML(data: any): string {
  const { product, seller, category, primaryImageUrl, formattedPrice } = data;
  
  // Clean description for meta tags
  const cleanDescription = product.description?.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() || product.title;
  const metaDescription = cleanDescription.length > 160 ? 
    cleanDescription.substring(0, 157) + '...' : cleanDescription;

  // Generate structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "description": cleanDescription,
    "image": primaryImageUrl,
    "brand": {
      "@type": "Brand",
      "name": "TeeMeYou"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://teemeyou.shop/product/${product.id}`,
      "priceCurrency": "USD",
      "price": product.price,
      "itemCondition": product.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": seller?.name || "TeeMeYou Seller"
      }
    },
    "category": category?.name || "General",
    "productID": product.id.toString(),
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.5",
      "reviewCount": "1",
      "bestRating": "5",
      "worstRating": "1"
    }
  };

  const pageTitle = product.metaTitle || `${product.title} - ${formattedPrice} | TeeMeYou`;
  const canonicalUrl = product.canonicalUrl || `https://teemeyou.shop/product/${product.id}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="title" content="${escapeHtml(pageTitle)}">
  <meta name="description" content="${escapeHtml(metaDescription)}">
  <meta name="keywords" content="${product.seoKeywords ? product.seoKeywords.join(', ') : generateKeywords(product, category)}">
  <meta name="author" content="TeeMeYou">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="product">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${escapeHtml(product.title)} - ${formattedPrice}">
  <meta property="og:description" content="${escapeHtml(metaDescription)} Shop on TeeMeYou marketplace.">
  <meta property="og:image" content="${primaryImageUrl}">
  <meta property="og:image:width" content="800">
  <meta property="og:image:height" content="600">
  <meta property="og:site_name" content="TeeMeYou">
  <meta property="og:locale" content="en_US">
  
  <!-- Product specific Open Graph -->
  <meta property="product:price:amount" content="${product.price}">
  <meta property="product:price:currency" content="USD">
  <meta property="product:condition" content="${product.condition}">
  <meta property="product:availability" content="in stock">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${canonicalUrl}">
  <meta name="twitter:title" content="${escapeHtml(product.title)} - ${formattedPrice}">
  <meta name="twitter:description" content="${escapeHtml(metaDescription)}">
  <meta name="twitter:image" content="${primaryImageUrl}">
  
  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="#000000">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="TeeMeYou">
  
  <!-- Structured Data -->
  <script type="application/ld+json">
    ${JSON.stringify(structuredData, null, 2)}
  </script>
  
  <!-- Preload critical resources -->
  <link rel="preload" href="${primaryImageUrl}" as="image">
  
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="https://teemeyou.shop/icon.svg">
  <link rel="apple-touch-icon" href="https://teemeyou.shop/icon-192.png">
  
  <!-- Redirect to React app for user interaction -->
  <script>
    if (!/bot|crawler|spider|crawling/i.test(navigator.userAgent)) {
      window.location.replace('${canonicalUrl}');
    }
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0; url=${canonicalUrl}">
  </noscript>
</head>
<body>
  <!-- Visible content for crawlers -->
  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 20px;">
    <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 16px; padding: 30px; max-width: 500px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
      <img src="${primaryImageUrl}" alt="${escapeHtml(product.title)}" style="max-width: 100%; max-height: 300px; object-fit: cover; border-radius: 12px; margin-bottom: 20px;">
      
      <h1 style="font-size: 1.5rem; margin: 0 0 15px 0;">${escapeHtml(product.title)}</h1>
      
      <div style="font-size: 2rem; font-weight: bold; margin: 0 0 10px 0; color: #FFD700;">${formattedPrice}</div>
      
      <div style="margin: 15px 0;">
        <span>Condition: <strong>${product.condition}</strong></span>
      </div>
      
      ${seller?.name ? `<div style="margin: 10px 0;">by ${escapeHtml(seller.name)}</div>` : ''}
      
      ${cleanDescription ? `<p style="font-size: 0.9rem; line-height: 1.4; margin: 20px 0;">${escapeHtml(cleanDescription.substring(0, 200))}${cleanDescription.length > 200 ? '...' : ''}</p>` : ''}
      
      <div style="margin-top: 25px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">
        <div style="font-size: 1rem; margin-bottom: 5px;">🛒 TeeMeYou Marketplace</div>
        <div style="font-size: 0.8rem;">Loading full product details...</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function generateKeywords(product: any, category: any): string {
  const keywords = [
    product.title.toLowerCase(),
    category?.name?.toLowerCase(),
    product.condition,
    'marketplace',
    'online shopping',
    'teemeyou'
  ].filter(Boolean);
  
  return keywords.join(', ');
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
```

## PWA SEO Integration

### Enhanced PWA Manifest

Update your `public/manifest.json`:

```json
{
  "name": "TeeMeYou - Online Marketplace",
  "short_name": "TeeMeYou",
  "description": "Your trusted online marketplace for quality products at great prices",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#667eea",
  "orientation": "portrait-primary",
  "scope": "/",
  "lang": "en-US",
  "categories": ["shopping", "marketplace", "business"],
  "icons": [
    {
      "src": "/icon-72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshot-wide.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "TeeMeYou Marketplace Desktop View"
    },
    {
      "src": "/screenshot-narrow.png",
      "sizes": "720x1280",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "TeeMeYou Marketplace Mobile View"
    }
  ],
  "shortcuts": [
    {
      "name": "Browse Products",
      "short_name": "Browse",
      "description": "Browse all products on TeeMeYou",
      "url": "/browse",
      "icons": [{ "src": "/icon-96.png", "sizes": "96x96" }]
    },
    {
      "name": "Sell Item",
      "short_name": "Sell",
      "description": "Sell your items on TeeMeYou",
      "url": "/sell",
      "icons": [{ "src": "/icon-96.png", "sizes": "96x96" }]
    }
  ]
}
```

### PWA Meta Tags in HTML

Update your `client/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- SEO Meta Tags -->
  <title>TeeMeYou.shop - Your Online Marketplace</title>
  <meta name="description" content="TeeMeYou.shop - Your trusted online marketplace for quality products at great prices. Buy and sell with confidence." />
  <meta name="keywords" content="marketplace, online shopping, deals, bargains, buy, sell, teemeyou" />
  <meta name="author" content="TeeMeYou" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://teemeyou.shop/" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://teemeyou.shop/" />
  <meta property="og:title" content="TeeMeYou.shop - Your Online Marketplace" />
  <meta property="og:description" content="Your trusted online marketplace for quality products at great prices" />
  <meta property="og:image" content="https://teemeyou.shop/icon-512.png" />
  <meta property="og:site_name" content="TeeMeYou" />
  <meta property="og:locale" content="en_US" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="TeeMeYou.shop - Your Online Marketplace" />
  <meta name="twitter:description" content="Your trusted online marketplace for quality products at great prices" />
  <meta name="twitter:image" content="https://teemeyou.shop/icon-512.png" />
  
  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="#667eea" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="TeeMeYou" />
  <meta name="application-name" content="TeeMeYou" />
  <meta name="msapplication-TileColor" content="#667eea" />
  <meta name="msapplication-config" content="/browserconfig.xml" />
  
  <!-- Icons -->
  <link rel="icon" type="image/svg+xml" href="/icon.svg" />
  <link rel="apple-touch-icon" href="/icon-180.png" />
  <link rel="mask-icon" href="/icon.svg" color="#667eea" />
  
  <!-- Manifest -->
  <link rel="manifest" href="/manifest.json" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

## Testing and Verification

### SEO Testing Script

Create `test-seo-implementation.js`:

```javascript
const fetch = require('node-fetch');

const BASE_URL = 'https://teemeyou.shop'; // Replace with your domain

async function testSEOImplementation() {
  console.log('🔍 Testing SEO Implementation for TeeMeYou.shop\n');

  // Test 1: Robots.txt
  console.log('1. Testing robots.txt...');
  try {
    const response = await fetch(`${BASE_URL}/robots.txt`);
    const robotsContent = await response.text();
    console.log('✅ Robots.txt accessible');
    console.log('Content preview:', robotsContent.substring(0, 200) + '...\n');
  } catch (error) {
    console.log('❌ Robots.txt test failed:', error.message);
  }

  // Test 2: Sitemap.xml
  console.log('2. Testing sitemap.xml...');
  try {
    const response = await fetch(`${BASE_URL}/sitemap.xml`);
    const sitemapContent = await response.text();
    const urlCount = (sitemapContent.match(/<url>/g) || []).length;
    console.log('✅ Sitemap accessible');
    console.log(`Found ${urlCount} URLs in sitemap\n`);
  } catch (error) {
    console.log('❌ Sitemap test failed:', error.message);
  }

  // Test 3: Product SEO endpoint
  console.log('3. Testing product SEO endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/api/seo/product/1`);
    const seoData = await response.json();
    
    if (seoData.success) {
      console.log('✅ Product SEO endpoint working');
      console.log('Sample SEO data:', {
        title: seoData.data.title,
        description: seoData.data.description.substring(0, 100) + '...',
        hasOpenGraph: !!seoData.data.openGraph,
        hasStructuredData: !!seoData.data.structuredData
      });
    } else {
      console.log('❌ Product SEO endpoint returned error:', seoData.error);
    }
  } catch (error) {
    console.log('❌ Product SEO test failed:', error.message);
  }

  // Test 4: Async SEO status
  console.log('\n4. Testing async SEO status...');
  try {
    const response = await fetch(`${BASE_URL}/api/async-seo/status`);
    const statusData = await response.json();
    
    if (statusData.success) {
      console.log('✅ Async SEO service accessible');
      console.log('Queue status:', statusData.data);
    } else {
      console.log('❌ Async SEO status failed');
    }
  } catch (error) {
    console.log('❌ Async SEO status test failed:', error.message);
  }

  // Test 5: PWA Manifest
  console.log('\n5. Testing PWA manifest...');
  try {
    const response = await fetch(`${BASE_URL}/manifest.json`);
    const manifest = await response.json();
    console.log('✅ PWA manifest accessible');
    console.log('Manifest info:', {
      name: manifest.name,
      shortName: manifest.short_name,
      iconCount: manifest.icons?.length || 0,
      hasScreenshots: !!manifest.screenshots
    });
  } catch (error) {
    console.log('❌ PWA manifest test failed:', error.message);
  }

  console.log('\n🎉 SEO Implementation Test Complete!');
}

// Run the test
testSEOImplementation().catch(console.error);
```

## Implementation Checklist

### Phase 1: Database Setup
- [ ] Add SEO fields to products table
- [ ] Create indexes for performance
- [ ] Set up AI interaction logging (optional)

### Phase 2: Core Services
- [ ] Implement SEO Service with AI integration
- [ ] Set up Async SEO Processing Service
- [ ] Configure environment variables for AI API keys

### Phase 3: API Routes
- [ ] Create SEO routes (robots.txt, sitemap.xml)
- [ ] Implement product SEO endpoints
- [ ] Set up async SEO queue endpoints

### Phase 4: Frontend Integration
- [ ] Implement React SEO hooks
- [ ] Add SEO metadata to product pages
- [ ] Integrate with existing product display components

### Phase 5: SSR Setup
- [ ] Implement server-side rendering for SEO
- [ ] Set up bot detection and redirects
- [ ] Configure structured data generation

### Phase 6: PWA Optimization
- [ ] Update PWA manifest with SEO-friendly data
- [ ] Add PWA meta tags to HTML
- [ ] Optimize icons and screenshots

### Phase 7: Testing & Monitoring
- [ ] Run SEO implementation tests
- [ ] Submit sitemaps to Google Search Console
- [ ] Monitor crawl errors and index status
- [ ] Set up SEO performance tracking

## Environment Variables

Add these to your `.env` file:

```env
# AI Service Configuration
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
# Or use OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# SEO Configuration
SITE_URL=https://teemeyou.shop
SEO_DEFAULT_TITLE=TeeMeYou.shop - Your Online Marketplace
SEO_DEFAULT_DESCRIPTION=Your trusted online marketplace for quality products at great prices
```

## Best Practices

1. **Content Quality**: Ensure AI-generated content is relevant and high-quality
2. **Performance**: Use async processing to avoid blocking user operations
3. **Caching**: Implement appropriate caching for SEO endpoints
4. **Monitoring**: Regular monitoring of search console performance
5. **Updates**: Keep structured data and meta tags updated with product changes
6. **Mobile First**: Ensure all SEO elements work well on mobile devices
7. **Loading Speed**: Optimize images and resources for fast loading times

## Troubleshooting

### Common Issues

1. **AI API Limits**: Implement rate limiting and fallback generation
2. **Database Performance**: Use indexes and optimize queries
3. **Cache Issues**: Clear caches when updating SEO data
4. **Bot Detection**: Test with various user agents
5. **Structured Data Errors**: Validate JSON-LD with Google's tools

### Debug Tools

- Google Search Console
- Rich Results Test
- PageSpeed Insights
- Lighthouse SEO audit
- Schema.org validator

This comprehensive guide provides everything needed to implement enterprise-level SEO optimization on teemeyou.shop, following the proven patterns from your existing codebase.
