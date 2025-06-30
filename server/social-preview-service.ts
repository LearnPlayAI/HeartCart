import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { products } from '../shared/schema';

interface ProductSocialData {
  id: number;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  imageUrl?: string;
  categoryName?: string;
  condition: string;
}

/**
 * Fetch product data optimized for social sharing
 */
async function getProductSocialData(productId: number): Promise<ProductSocialData | null> {
  try {
    const productData = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!productData.length) {
      return null;
    }

    const product = productData[0];
    
    return {
      id: product.id,
      name: product.name || 'Product',
      description: product.description || '',
      price: product.price || 0,
      salePrice: product.salePrice || undefined,
      imageUrl: product.imageUrl || undefined,
      condition: product.condition || 'new',
    };
  } catch (error) {
    console.error(`Error fetching social data for product ${productId}:`, error);
    return null;
  }
}

/**
 * Generate HTML with Open Graph meta tags for social sharing
 */
function generateProductSocialHTML(product: ProductSocialData): string {
  const baseUrl = 'https://teemeyou.shop';
  const productUrl = `${baseUrl}/product/id/${product.id}`;
  
  // Use sale price if available, otherwise regular price
  const displayPrice = product.salePrice || product.price;
  
  // Optimize image URL for social sharing - ensure proper URL construction
  const socialImageUrl = product.imageUrl 
    ? (product.imageUrl.startsWith('http') 
        ? product.imageUrl 
        : `${baseUrl}/api/files/${product.imageUrl.replace(/^\/api\/files\//, '')}`)
    : `${baseUrl}/api/social-preview/product-image/${product.id}`;
  
  // Create optimized meta description with TeeMeYou branding
  const metaDescription = `${product.name} - R${displayPrice.toLocaleString()} | ${product.condition} condition | Shop on TeeMeYou - South Africa's trusted online marketplace for quality products with fast delivery.`;
  
  // Truncate description to Facebook's 300 character limit
  const truncatedDescription = metaDescription.length > 300 
    ? metaDescription.substring(0, 297) + '...'
    : metaDescription;

  // Clean description for HTML
  const cleanDescription = product.description
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/"/g, '&quot;') // Escape quotes
    .substring(0, 200); // Limit length

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Basic Meta Tags -->
  <title>${product.name} - R${displayPrice.toLocaleString()} | TeeMeYou</title>
  <meta name="description" content="${truncatedDescription}">
  
  <!-- Open Graph Meta Tags for Facebook -->
  <meta property="og:type" content="product">
  <meta property="og:title" content="${product.name} - R${displayPrice.toLocaleString()}">
  <meta property="og:description" content="${truncatedDescription}">
  <meta property="og:url" content="${productUrl}">
  <meta property="og:image" content="${socialImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${product.name}">
  <meta property="og:site_name" content="TeeMeYou">
  <meta property="og:locale" content="en_ZA">
  
  <!-- Product-specific Open Graph -->
  <meta property="product:price:amount" content="${displayPrice}">
  <meta property="product:price:currency" content="ZAR">
  <meta property="product:availability" content="in stock">
  <meta property="product:condition" content="${product.condition.toLowerCase()}">
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${product.name} - R${displayPrice.toLocaleString()}">
  <meta name="twitter:description" content="${truncatedDescription}">
  <meta name="twitter:image" content="${socialImageUrl}">
  <meta name="twitter:image:alt" content="${product.name}">
  
  <!-- WhatsApp specific (uses Open Graph) -->
  <meta property="og:image:type" content="image/jpeg">
  
  <!-- Redirect to actual product page -->
  <script>
    // Only redirect if this is not a crawler/bot
    if (!navigator.userAgent.match(/facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|bot|crawler|spider/i)) {
      window.location.replace('${productUrl}');
    }
  </script>
</head>
<body>
  <!-- Fallback content for crawlers -->
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #FF69B4, #E91E63); color: white; border-radius: 12px;">
    <div style="background: white; color: #333; padding: 20px; border-radius: 8px;">
      <h1 style="color: #E91E63; margin: 0 0 10px 0;">${product.name}</h1>
      <div style="font-size: 24px; color: #FF69B4; font-weight: bold; margin: 10px 0;">
        R${displayPrice.toLocaleString()}
        ${product.salePrice && product.price !== product.salePrice ? 
          `<span style="font-size: 16px; color: #666; text-decoration: line-through; margin-left: 10px;">R${product.price.toLocaleString()}</span>` 
          : ''}
      </div>
      ${product.imageUrl ? `<img src="${socialImageUrl}" alt="${product.name}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0;">` : ''}
      <p style="margin: 15px 0; line-height: 1.5; color: #555;">${cleanDescription}</p>
      <div style="margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 6px;">
        <strong style="color: #E91E63;">Condition:</strong> ${product.condition}<br>
        <strong style="color: #E91E63;">Delivery:</strong> Fast shipping across South Africa<br>
        <strong style="color: #E91E63;">Store:</strong> TeeMeYou - Trusted Online Marketplace
      </div>
      <a href="${productUrl}" style="display: inline-block; background: linear-gradient(135deg, #FF69B4, #E91E63); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold;">
        🛍️ Shop Now on TeeMeYou
      </a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Handle social preview request for product
 */
export async function handleProductSocialPreview(req: Request, res: Response): Promise<void> {
  try {
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    // Fetch product data
    const productData = await getProductSocialData(productId);
    
    if (!productData) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Generate and return HTML with Open Graph meta tags
    const socialHTML = generateProductSocialHTML(productData);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(socialHTML);
    
  } catch (error) {
    console.error('Error generating product social preview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Serve optimized product image for social sharing
 */
export async function handleProductSocialImage(req: Request, res: Response): Promise<void> {
  try {
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    // Get product image URL
    const productData = await db
      .select({ imageUrl: products.imageUrl })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!productData.length || !productData[0].imageUrl) {
      // Return default TeeMeYou branded image for products without images
      res.redirect('/teemeyou-social-default.png');
      return;
    }

    // Redirect to the actual image URL
    res.redirect(productData[0].imageUrl);
    
  } catch (error) {
    console.error('Error serving product social image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}