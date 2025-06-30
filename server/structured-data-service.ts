import { Product, Category } from "@shared/schema";

/**
 * Structured Data Service for TeeMeYou.shop
 * Generates JSON-LD structured data for rich snippets and SEO
 */

export interface ProductStructuredData {
  "@context": string;
  "@type": string;
  name: string;
  description: string;
  image: string[];
  sku?: string;
  brand?: {
    "@type": string;
    name: string;
  };
  offers: {
    "@type": string;
    url: string;
    priceCurrency: string;
    price: string;
    priceValidUntil?: string;
    availability: string;
    seller: {
      "@type": string;
      name: string;
      url: string;
    };
  };
  aggregateRating?: {
    "@type": string;
    ratingValue: string;
    reviewCount: string;
  };
  category?: string;
}

export interface OrganizationStructuredData {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  logo: string;
  sameAs: string[];
  address: {
    "@type": string;
    streetAddress: string;
    addressLocality: string;
    addressCountry: string;
  };
  contactPoint: {
    "@type": string;
    telephone: string;
    contactType: string;
    areaServed: string;
    availableLanguage: string[];
  };
}

class StructuredDataService {
  private readonly baseUrl = 'https://teemeyou.shop';
  private readonly organizationName = 'TeeMeYou.shop';

  /**
   * Generate Product structured data using existing SEO fields
   */
  generateProductStructuredData(product: any, category?: any): ProductStructuredData {
    const structuredData: ProductStructuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.meta_title || product.name,
      description: product.meta_description || product.description || product.name,
      image: this.getProductImages(product),
      category: category?.name,
      offers: {
        "@type": "Offer",
        url: product.canonical_url || `${this.baseUrl}/product/id/${product.id}`,
        priceCurrency: "ZAR",
        price: (product.sale_price || product.price).toString(),
        availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        seller: {
          "@type": "Organization",
          name: this.organizationName,
          url: this.baseUrl
        }
      }
    };

    // Add SKU if available
    if (product.sku) {
      structuredData.sku = product.sku;
    }

    // Add brand if available
    if (product.brand) {
      structuredData.brand = {
        "@type": "Brand",
        name: product.brand
      };
    }

    // Add sale price validity
    if (product.sale_price && product.flash_deal_end) {
      structuredData.offers.priceValidUntil = product.flash_deal_end;
    }

    return structuredData;
  }

  /**
   * Generate Organization structured data for TeeMeYou.shop
   */
  generateOrganizationStructuredData(): OrganizationStructuredData {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: this.organizationName,
      url: this.baseUrl,
      logo: `${this.baseUrl}/assets/logo.png`,
      sameAs: [
        // Add social media URLs when available
      ],
      address: {
        "@type": "PostalAddress",
        streetAddress: "South Africa",
        addressLocality: "Nationwide",
        addressCountry: "ZA"
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+27-XXX-XXX-XXXX", // Replace with actual number
        contactType: "customer service",
        areaServed: "ZA",
        availableLanguage: ["English", "Afrikaans"]
      }
    };
  }

  /**
   * Generate BreadcrumbList structured data
   */
  generateBreadcrumbStructuredData(breadcrumbs: Array<{name: string, url: string}>): object {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: crumb.url
      }))
    };
  }

  /**
   * Generate FAQ structured data for product pages
   */
  generateFAQStructuredData(faqs: Array<{question: string, answer: string}>): object {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(faq => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer
        }
      }))
    };
  }

  /**
   * Generate Open Graph meta tags
   */
  generateOpenGraphTags(product: any, category?: any): string {
    const title = product.meta_title || product.name;
    const description = product.meta_description || product.description || product.name;
    const image = this.getMainProductImage(product);
    const url = product.canonical_url || `${this.baseUrl}/product/id/${product.id}`;
    const price = product.sale_price || product.price;

    return `
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="product">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${this.escapeHtml(title)}">
    <meta property="og:description" content="${this.escapeHtml(description)}">
    <meta property="og:image" content="${image}">
    <meta property="og:site_name" content="${this.organizationName}">
    <meta property="product:price:amount" content="${price}">
    <meta property="product:price:currency" content="ZAR">
    ${product.brand ? `<meta property="product:brand" content="${this.escapeHtml(product.brand)}">` : ''}
    ${category ? `<meta property="product:category" content="${this.escapeHtml(category.name)}">` : ''}
    ${product.stock > 0 ? '<meta property="product:availability" content="in stock">' : '<meta property="product:availability" content="out of stock">'}
    
    <!-- Twitter -->
    <meta property="twitter:card" content="product">
    <meta property="twitter:url" content="${url}">
    <meta property="twitter:title" content="${this.escapeHtml(title)}">
    <meta property="twitter:description" content="${this.escapeHtml(description)}">
    <meta property="twitter:image" content="${image}">
    <meta property="twitter:label1" content="Price">
    <meta property="twitter:data1" content="R${price}">
    <meta property="twitter:label2" content="Availability">
    <meta property="twitter:data2" content="${product.stock > 0 ? 'In Stock' : 'Out of Stock'}">
    `.trim();
  }

  /**
   * Generate complete meta tags for a product page
   */
  generateProductMetaTags(product: any, category?: any): string {
    const title = product.meta_title || product.name;
    const description = product.meta_description || product.description || product.name;
    const keywords = product.meta_keywords || '';
    const canonical = product.canonical_url || `${this.baseUrl}/product/id/${product.id}`;

    return `
    <!-- SEO Meta Tags -->
    <title>${this.escapeHtml(title)}</title>
    <meta name="description" content="${this.escapeHtml(description)}">
    ${keywords ? `<meta name="keywords" content="${this.escapeHtml(keywords)}">` : ''}
    <link rel="canonical" href="${canonical}">
    
    ${this.generateOpenGraphTags(product, category)}
    `.trim();
  }

  /**
   * Get product images for structured data
   */
  private getProductImages(product: any): string[] {
    const images: string[] = [];
    
    if (product.image_url) {
      const imageUrl = product.image_url.startsWith('http') 
        ? product.image_url 
        : `${this.baseUrl}${product.image_url}`;
      images.push(imageUrl);
    }

    if (product.additional_images) {
      product.additional_images.forEach((img: string) => {
        if (img) {
          const imageUrl = img.startsWith('http') ? img : `${this.baseUrl}${img}`;
          images.push(imageUrl);
        }
      });
    }

    return images;
  }

  /**
   * Get main product image
   */
  private getMainProductImage(product: any): string {
    if (product.image_url) {
      return product.image_url.startsWith('http') 
        ? product.image_url 
        : `${this.baseUrl}${product.image_url}`;
    }
    
    return `${this.baseUrl}/assets/default-product.jpg`;
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

export const structuredDataService = new StructuredDataService();