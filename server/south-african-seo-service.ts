/**
 * South African Market SEO Service
 * Specialized SEO optimizations for the South African e-commerce market
 */

import { Product, Category } from "@shared/schema";
import { structuredDataService } from './structured-data-service';

export interface SouthAfricanSEOData {
  localizedKeywords: string[];
  currencyOptimizedContent: string;
  localizedMetaDescription: string;
  pudoDeliveryMeta: string;
  southAfricanStructuredData: object;
}

class SouthAfricanSEOService {
  private readonly southAfricanKeywords = [
    'South Africa', 'SA', 'Cape Town', 'Johannesburg', 'Durban', 'Pretoria',
    'buy online South Africa', 'delivery South Africa', 'PUDO locker',
    'South African store', 'local delivery', 'ZAR', 'rand'
  ];

  private readonly pudoLocations = [
    'PUDO locker', 'Pick n Pay', 'Shoprite', 'Checkers', 'Spar',
    'convenient pickup points', 'secure collection'
  ];

  /**
   * Generate South African market-optimized SEO data
   */
  generateSouthAfricanSEO(product: Product, category?: Category): SouthAfricanSEOData {
    const baseKeywords = product.seoKeywords || [];
    
    return {
      localizedKeywords: this.generateLocalizedKeywords(product, baseKeywords),
      currencyOptimizedContent: this.generateCurrencyOptimizedContent(product),
      localizedMetaDescription: this.generateLocalizedMetaDescription(product),
      pudoDeliveryMeta: this.generatePudoDeliveryMeta(product),
      southAfricanStructuredData: this.generateSouthAfricanStructuredData(product, category)
    };
  }

  /**
   * Generate localized keywords for South African market
   */
  private generateLocalizedKeywords(product: Product, baseKeywords: string[]): string[] {
    const localizedKeywords = [...baseKeywords];
    
    // Add South African location keywords
    const saKeywords = [
      `${product.name} South Africa`,
      `buy ${product.name} SA`,
      `${product.name} delivery South Africa`,
      `${product.name} online South Africa`
    ];

    // Add category-specific SA keywords
    if (product.categoryId) {
      saKeywords.push(
        `${product.name} Cape Town`,
        `${product.name} Johannesburg`,
        `${product.name} Durban`
      );
    }

    // Add PUDO delivery keywords
    saKeywords.push(
      `${product.name} PUDO delivery`,
      `${product.name} pickup point`,
      `${product.name} convenient collection`
    );

    return [...localizedKeywords, ...saKeywords].slice(0, 15); // Limit to 15 keywords
  }

  /**
   * Generate currency-optimized content for ZAR
   */
  private generateCurrencyOptimizedContent(product: Product): string {
    const price = product.salePrice || product.price;
    const formattedPrice = `R${price.toFixed(2)}`;
    
    let content = `Get your ${product.name} for just ${formattedPrice} with convenient delivery across South Africa. `;
    
    if (product.salePrice && product.salePrice < product.price) {
      const savings = product.price - product.salePrice;
      content += `Save R${savings.toFixed(2)} on this limited-time offer. `;
    }
    
    content += `Free PUDO locker delivery available to major South African cities including Cape Town, Johannesburg, Durban, and Pretoria.`;
    
    return content;
  }

  /**
   * Generate localized meta description
   */
  private generateLocalizedMetaDescription(product: Product): string {
    const baseDescription = product.metaDescription || product.description || product.name;
    const price = product.salePrice || product.price;
    
    // Enhance with South African context
    let localizedDescription = baseDescription;
    
    // Add pricing and delivery info
    localizedDescription += ` Available across South Africa from R${price.toFixed(2)} with secure PUDO locker delivery.`;
    
    // Add location targeting
    if (localizedDescription.length < 140) {
      localizedDescription += ` Shop online in Cape Town, Johannesburg, Durban & nationwide.`;
    }
    
    // Ensure it stays under 160 characters for optimal SEO
    return localizedDescription.length > 160 
      ? localizedDescription.substring(0, 157) + '...'
      : localizedDescription;
  }

  /**
   * Generate PUDO delivery-specific meta content
   */
  private generatePudoDeliveryMeta(product: Product): string {
    return `Secure PUDO locker delivery available for ${product.name} across South Africa. Convenient pickup at Pick n Pay, Shoprite, Checkers, and Spar locations nationwide. Safe, secure, and convenient collection at your preferred time.`;
  }

  /**
   * Generate South African-specific structured data
   */
  private generateSouthAfricanStructuredData(product: Product, category?: Category): object {
    const baseStructuredData = structuredDataService.generateProductStructuredData(product, category);
    
    // Enhance with South African market data
    return {
      ...baseStructuredData,
      offers: {
        ...baseStructuredData.offers,
        areaServed: {
          "@type": "Country",
          name: "South Africa",
          identifier: "ZA"
        },
        availableAtOrFrom: {
          "@type": "Place",
          name: "PUDO Locker Network",
          description: "Secure pickup points across South Africa including Pick n Pay, Shoprite, Checkers, and Spar locations"
        },
        deliveryMethod: {
          "@type": "DeliveryMethod",
          name: "PUDO Locker Delivery",
          description: "Convenient and secure pickup from your preferred locker location"
        }
      },
      audience: {
        "@type": "Audience",
        geographicArea: {
          "@type": "Country",
          name: "South Africa"
        }
      }
    };
  }

  /**
   * Generate local business schema for TeeMeYou
   */
  generateLocalBusinessSchema(): object {
    return {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      name: "TeeMeYou.shop",
      description: "South Africa's premier online shopping destination with PUDO locker delivery",
      url: "https://teemeyou.shop",
      areaServed: {
        "@type": "Country",
        name: "South Africa",
        identifier: "ZA"
      },
      currenciesAccepted: "ZAR",
      paymentAccepted: ["Credit Card", "EFT", "Bank Transfer"],
      priceRange: "R",
      address: {
        "@type": "PostalAddress",
        addressCountry: "ZA",
        addressRegion: "Nationwide"
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        areaServed: "ZA",
        availableLanguage: ["English", "Afrikaans"]
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "TeeMeYou Product Catalog",
        itemListElement: {
          "@type": "OfferCatalog",
          name: "Electronics, Home & Garden, Fashion & More"
        }
      }
    };
  }

  /**
   * Generate South African market sitemap annotations
   */
  generateSouthAfricanSitemapAnnotations(product: Product): object {
    return {
      "hreflang": "en-ZA",
      "geo:region": "ZA",
      "geo:placename": "South Africa",
      "currency": "ZAR",
      "delivery": "PUDO",
      "market": "south-african"
    };
  }

  /**
   * Generate localized FAQ structured data
   */
  generateLocalizedFAQData(): object {
    const southAfricanFAQs = [
      {
        question: "Do you deliver to my area in South Africa?",
        answer: "Yes! We deliver nationwide across South Africa using our secure PUDO locker network. Simply select your nearest pickup point during checkout."
      },
      {
        question: "What payment methods do you accept in South Africa?",
        answer: "We accept all major credit cards, EFT payments, and bank transfers. All prices are displayed in South African Rand (ZAR)."
      },
      {
        question: "How does PUDO locker delivery work?",
        answer: "PUDO locker delivery allows you to collect your order from convenient locations like Pick n Pay, Shoprite, Checkers, and Spar stores. You'll receive an SMS with collection details once your order arrives."
      },
      {
        question: "Is it safe to shop online in South Africa?",
        answer: "Absolutely! We use secure payment processing and our PUDO locker system ensures safe delivery. Your personal and payment information is protected with enterprise-grade security."
      },
      {
        question: "Can I return items if I'm not satisfied?",
        answer: "Yes, we offer a hassle-free return policy for South African customers. Items can be returned within 30 days for a full refund or exchange."
      }
    ];

    return structuredDataService.generateFAQStructuredData(southAfricanFAQs);
  }

  /**
   * Generate enhanced robots.txt for South African market
   */
  generateEnhancedRobotsTxt(): string {
    return `User-agent: *
Allow: /
Allow: /product/
Allow: /category/
Allow: /search
Allow: /flash-deals

# South African Market Optimization
Allow: /sitemap.xml
Allow: /sitemap-products.xml
Allow: /sitemap-categories.xml
Allow: /sitemap-pages.xml

# Prevent crawling of admin and auth pages
Disallow: /admin/
Disallow: /auth/
Disallow: /api/
Disallow: /cart
Disallow: /checkout
Disallow: /order/
Disallow: /profile

# Sitemap locations
Sitemap: https://teemeyou.shop/sitemap.xml
Sitemap: https://teemeyou.shop/sitemap-products.xml
Sitemap: https://teemeyou.shop/sitemap-categories.xml
Sitemap: https://teemeyou.shop/sitemap-pages.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1

# Block common bad bots while allowing South African search engines
User-agent: SemrushBot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

# Allow Google, Bing, and other major search engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: DuckDuckBot
Allow: /`;
  }
}

export const southAfricanSEOService = new SouthAfricanSEOService();