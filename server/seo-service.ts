import { db } from './db';
import { products, categories, type Product, type Category } from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * SEO Service for TeeMeYou.shop
 * Handles sitemap generation, SEO metadata, and search engine optimization
 */

export interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  images?: Array<{
    loc: string;
    caption?: string;
    title?: string;
  }>;
}

class SEOService {
  private readonly baseUrl = 'https://teemeyou.shop';

  /**
   * Generate main sitemap index
   */
  async generateSitemapIndex(): Promise<string> {
    const now = new Date().toISOString();
    
    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${this.baseUrl}/sitemap-pages.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${this.baseUrl}/sitemap-products.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${this.baseUrl}/sitemap-categories.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;

    return sitemapIndex;
  }

  /**
   * Generate static pages sitemap
   */
  async generatePagesSitemap(): Promise<string> {
    const now = new Date().toISOString();
    
    const staticPages: SitemapUrl[] = [
      {
        loc: `${this.baseUrl}/`,
        lastmod: now,
        changefreq: 'daily',
        priority: 1.0
      },
      {
        loc: `${this.baseUrl}/category`,
        lastmod: now,
        changefreq: 'daily',
        priority: 0.9
      },
      {
        loc: `${this.baseUrl}/search`,
        lastmod: now,
        changefreq: 'weekly',
        priority: 0.8
      },
      {
        loc: `${this.baseUrl}/flash-deals`,
        lastmod: now,
        changefreq: 'hourly',
        priority: 0.9
      }
    ];

    return this.generateSitemapXML(staticPages);
  }

  /**
   * Generate categories sitemap
   */
  async generateCategoriesSitemap(): Promise<string> {
    try {
      const activeCategories = await db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          updatedAt: categories.updatedAt
        })
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(categories.displayOrder, categories.name);

      const categoryUrls: SitemapUrl[] = activeCategories.map(category => ({
        loc: `${this.baseUrl}/category/${category.slug}`,
        lastmod: category.updatedAt || new Date().toISOString(),
        changefreq: 'weekly',
        priority: 0.8
      }));

      return this.generateSitemapXML(categoryUrls);
    } catch (error) {
      console.error('Error generating categories sitemap:', error);
      return this.generateSitemapXML([]);
    }
  }

  /**
   * Generate products sitemap with all active products
   */
  async generateProductsSitemap(): Promise<string> {
    try {
      const activeProducts = await db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          price: products.price,
          salePrice: products.salePrice,
          imageUrl: products.imageUrl,
          createdAt: products.createdAt,
          metaTitle: products.metaTitle,
          metaDescription: products.metaDescription,
          canonicalUrl: products.canonicalUrl
        })
        .from(products)
        .where(and(
          eq(products.isActive, true),
          eq(products.supplierAvailable, true)
        ))
        .orderBy(desc(products.createdAt));

      console.log(`[SEO] Generating sitemap for ${activeProducts.length} active products`);
      
      // Debug first product to understand data structure
      if (activeProducts.length > 0) {
        console.log(`[SEO] First product data:`, JSON.stringify(activeProducts[0], null, 2));
      }

      const productUrls: SitemapUrl[] = activeProducts.map(product => {
        // Use canonical URL if available, otherwise construct from slug or fallback to ID
        const productUrl = product.canonicalUrl || 
                          (product.slug ? `${this.baseUrl}/product/${product.slug}` : `${this.baseUrl}/product/id/${product.id}`);
        const lastmod = product.createdAt || new Date().toISOString();
        
        // Calculate priority based on product features
        let priority = 0.7; // Default priority
        if (product.salePrice && product.salePrice < product.price) priority = 0.8; // Sale items
        
        const sitemapUrl: SitemapUrl = {
          loc: productUrl,
          lastmod,
          changefreq: 'weekly',
          priority
        };

        // Add product image if available
        if (product.imageUrl) {
          // Database stores URLs starting with /api/files/ - just prepend base URL
          const imageUrl = `${this.baseUrl}${product.imageUrl}`;
          console.log(`[SEO] Product ${product.id} imageUrl from DB: "${product.imageUrl}" -> Final URL: "${imageUrl}"`);
          
          sitemapUrl.images = [{
            loc: imageUrl,
            caption: `${product.name} - R${product.salePrice || product.price}`,
            title: product.name
          }];
        }

        return sitemapUrl;
      });

      return this.generateSitemapXML(productUrls);
    } catch (error) {
      console.error('Error generating products sitemap:', error);
      return this.generateSitemapXML([]);
    }
  }

  /**
   * Generate XML sitemap from URLs array
   */
  private generateSitemapXML(urls: SitemapUrl[]): string {
    const urlEntries = urls.map(url => {
      let entry = `  <url>
    <loc>${this.escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority.toFixed(1)}</priority>`;

      // Add images if present
      if (url.images && url.images.length > 0) {
        url.images.forEach(image => {
          entry += `
    <image:image>
      <image:loc>${this.escapeXml(image.loc)}</image:loc>`;
          if (image.caption) {
            entry += `
      <image:caption>${this.escapeXml(image.caption)}</image:caption>`;
          }
          if (image.title) {
            entry += `
      <image:title>${this.escapeXml(image.title)}</image:title>`;
          }
          entry += `
    </image:image>`;
        });
      }

      entry += `
  </url>`;
      return entry;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries}
</urlset>`;
  }

  /**
   * Generate robots.txt content
   */
  generateRobotsTxt(): string {
    return `User-agent: *
Allow: /

# Important pages for indexing
Allow: /
Allow: /product/*
Allow: /category/*
Allow: /search*
Allow: /flash-deals

# Sitemap location
Sitemap: ${this.baseUrl}/sitemap.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1

# Block admin and sensitive pages
Disallow: /api/
Disallow: /admin/
Disallow: /auth/
Disallow: /checkout/
Disallow: /profile/
Disallow: /my-orders/
Disallow: /developer/

# TeeMeYou.shop - South African E-commerce Marketplace
# Specializing in quality products with PUDO delivery
`;
  }

  /**
   * Generate structured data for a product
   */
  generateProductStructuredData(product: Partial<Product>, category?: Partial<Category>): object {
    const baseUrl = this.baseUrl;
    const productUrl = product.canonicalUrl || `${baseUrl}/product/${product.id || 0}`;
    const imageUrl = product.imageUrl ? `${baseUrl}${product.imageUrl}` : `${baseUrl}/icon-192.png`;
    
    // Determine effective price (sale price or regular price)
    const effectivePrice = product.salePrice || product.price || 0;
    
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.metaDescription || product.description || product.name,
      "image": [imageUrl],
      "url": productUrl,
      "sku": product.sku || (product.id || 0).toString(),
      "brand": {
        "@type": "Brand",
        "name": product.brand || "TeeMeYou"
      },
      "category": category?.name || "General",
      "offers": {
        "@type": "Offer",
        "url": productUrl,
        "priceCurrency": "ZAR",
        "price": effectivePrice.toString(),
        "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        "itemCondition": "https://schema.org/NewCondition",
        "availability": (product.stock || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": "TeeMeYou.shop",
          "url": baseUrl
        },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": "85",
            "currency": "ZAR"
          },
          "shippingDestination": {
            "@type": "DefinedRegion",
            "addressCountry": "ZA"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": {
              "@type": "QuantitativeValue",
              "minValue": 1,
              "maxValue": 3,
              "unitCode": "DAY"
            },
            "transitTime": {
              "@type": "QuantitativeValue",
              "minValue": 3,
              "maxValue": 7,
              "unitCode": "DAY"
            }
          }
        }
      },
      "aggregateRating": (product.reviewCount || 0) > 0 ? {
        "@type": "AggregateRating",
        "ratingValue": product.rating || 4.5,
        "reviewCount": product.reviewCount || 1,
        "bestRating": 5,
        "worstRating": 1
      } : undefined
    };
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Get sitemap last modified date
   */
  async getSitemapLastModified(): Promise<string> {
    try {
      const latestProduct = await db
        .select({ createdAt: products.createdAt })
        .from(products)
        .where(eq(products.isActive, true))
        .orderBy(desc(products.createdAt))
        .limit(1);

      return latestProduct[0]?.createdAt || new Date().toISOString();
    } catch (error) {
      console.error('Error getting sitemap last modified:', error);
      return new Date().toISOString();
    }
  }
}

export const seoService = new SEOService();