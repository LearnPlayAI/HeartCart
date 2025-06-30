/**
 * Server-side Open Graph Meta Tag Injection for Product Pages
 * Injects product-specific meta tags for Facebook crawler
 */

import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { products } from '@shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

interface ProductMetaData {
  id: number;
  name: string;
  description: string;
  price: number;
  salePrice: number | null;
  imageUrl: string;
}

export async function injectProductMetaTags(req: Request, res: Response, next: NextFunction) {
  // Only handle GET requests to product pages
  if (req.method !== 'GET') {
    return next();
  }

  // Check if this is a product page request
  const productIdMatch = req.path.match(/^\/product\/id\/(\d+)$/);
  if (!productIdMatch) {
    return next();
  }

  // Only serve static HTML to crawlers/bots, let regular users access the React app
  const userAgent = req.get('User-Agent') || '';
  const isCrawler = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|bot|crawler|spider|googlebot/i.test(userAgent);
  
  console.log(`[META] Product page request: ${req.path}, User-Agent: ${userAgent}, isCrawler: ${isCrawler}`);
  
  if (!isCrawler) {
    console.log(`[META] Regular user detected, passing to React app`);
    return next();
  }
  
  console.log(`[META] Crawler detected, serving static HTML`);

  const productId = parseInt(productIdMatch[1]);
  
  try {
    // Fetch product data from database
    const result = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        salePrice: products.salePrice,
        imageUrl: products.imageUrl,
      })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (result.length === 0) {
      return next();
    }

    const product = result[0];
    const displayPrice = product.salePrice || product.price;
    
    // In development, we need to handle this differently since Vite serves the HTML
    // Check if we're in production mode
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!isProduction) {
      // In development, we'll use a simpler approach - serve basic HTML with meta tags
      const productHtml = generateProductHtml(product, displayPrice);
      res.setHeader('Content-Type', 'text/html');
      return res.send(productHtml);
    }
    
    // Read the base HTML file (production)
    const htmlPath = path.join(process.cwd(), 'dist', 'public', 'index.html');
    let html: string;
    
    try {
      html = fs.readFileSync(htmlPath, 'utf-8');
    } catch (error) {
      // If dist doesn't exist, skip injection
      return next();
    }

    // Generate the complete product HTML with only product-specific meta tags
    const productHtml = generateProductHtml(product, displayPrice);

    // Send the product HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(productHtml);
    
  } catch (error) {
    console.error('Error injecting product meta tags:', error);
    return next();
  }
}

function generateProductHtml(product: ProductMetaData, displayPrice: number): string {
  const description = product.description || `${product.name} - R${displayPrice.toLocaleString()} | Shop on TeeMeYou - South Africa's trusted online marketplace for quality products with fast delivery.`;
  const imageUrl = product.imageUrl ? `https://teemeyou.shop${product.imageUrl}` : `https://teemeyou.shop/api/files/default-product-image.jpg`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Product-specific Open Graph Meta Tags for Facebook -->
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${escapeHtml(product.name)} - R${displayPrice.toLocaleString()}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="https://teemeyou.shop/product/id/${product.id}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(product.name)}" />
    <meta property="og:site_name" content="TeeMeYou" />
    <meta property="og:locale" content="en_ZA" />
    
    <!-- Product-specific Open Graph -->
    <meta property="product:price:amount" content="${displayPrice.toString()}" />
    <meta property="product:price:currency" content="ZAR" />
    <meta property="product:availability" content="in stock" />
    <meta property="product:condition" content="new" />
    <meta property="product:brand" content="TeeMeYou" />
    <meta property="product:retailer" content="TeeMeYou" />
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(product.name)} - R${displayPrice.toLocaleString()}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="twitter:image:alt" content="${escapeHtml(product.name)}" />
    
    <!-- Page Title and Description -->
    <title>${escapeHtml(product.name)} - R${displayPrice.toLocaleString()} | TeeMeYou</title>
    <meta name="description" content="${escapeHtml(description)}" />
    
    <!-- Basic Branding -->
    <meta name="theme-color" content="#FF69B4">
    <link rel="icon" type="image/png" href="/icon-192.png">
    
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #FF69B4 0%, #E91E63 100%);
            min-height: 100vh;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        .container {
            max-width: 600px;
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
        }
        .logo {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .product-name {
            font-size: 1.5rem;
            margin-bottom: 10px;
        }
        .price {
            font-size: 2rem;
            font-weight: bold;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            background: white;
            color: #FF69B4;
            padding: 15px 30px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            margin-top: 20px;
            transition: transform 0.2s;
        }
        .button:hover {
            transform: scale(1.05);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">TEE ME YOU</div>
        <div class="product-name">${escapeHtml(product.name)}</div>
        <div class="price">R${displayPrice.toLocaleString()}</div>
        <p>South Africa's trusted online marketplace for quality products with fast delivery.</p>
        <a href="https://teemeyou.shop/product/id/${product.id}" class="button">View Product</a>
    </div>
    
    <script>
        // Redirect to main app after a short delay for better user experience
        setTimeout(() => {
            window.location.href = 'https://teemeyou.shop/product/id/${product.id}';
        }, 1000);
    </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (match) => map[match]);
}