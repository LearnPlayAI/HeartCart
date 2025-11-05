import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { storage } from './storage';
import { logger } from './logger';
import { sendSuccess, sendError } from './api-response';
import asyncHandler from 'express-async-handler';

const router = Router();

router.get('/products/:id/qr-code', asyncHandler(async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      sendError(res, 'Invalid product ID', 400);
      return;
    }

    const product = await storage.getProductById(productId, { includeInactive: true });
    
    if (!product) {
      sendError(res, 'Product not found', 404);
      return;
    }

    // Always use production URL for QR codes (they're meant for physical/external sharing)
    const baseUrl = 'https://heartcart.shop';
    
    // Get platform from query parameter, default to offline
    const platform = (req.query.platform as string) || 'offline';
    const validPlatforms = ['whatsapp', 'facebook', 'instagram', 'tiktok', 'offline', 'social'];
    const utmMedium = validPlatforms.includes(platform) ? platform : 'offline';
    
    // Use product ID format for reliable routing
    const productUrl = `${baseUrl}/product/id/${product.id}?utm_source=qr&utm_medium=${utmMedium}&utm_campaign=product_${platform}`;
    
    const format = (req.query.format as string) || 'png';
    const size = parseInt(req.query.size as string) || 300;
    
    if (format === 'svg') {
      const qrSvg = await QRCode.toString(productUrl, {
        type: 'svg',
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `inline; filename="product-${productId}-qr.svg"`);
      res.send(qrSvg);
      return;
    } else {
      const qrBuffer = await QRCode.toBuffer(productUrl, {
        type: 'png',
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="product-${productId}-qr.png"`);
      res.send(qrBuffer);
      return;
    }
  } catch (error) {
    logger.error('Error generating QR code', { error, productId: req.params.id });
    sendError(res, 'Failed to generate QR code', 500);
    return;
  }
}));

router.get('/products/:id/qr-social-kit', asyncHandler(async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      sendError(res, 'Invalid product ID', 400);
      return;
    }

    const product = await storage.getProductById(productId, { includeInactive: true });
    
    if (!product) {
      sendError(res, 'Product not found', 404);
      return;
    }

    // Always use production URL for QR codes (they're meant for physical/external sharing)
    const baseUrl = 'https://heartcart.shop';
    
    // Use product ID format for reliable routing
    const platforms = {
      whatsapp: `${baseUrl}/product/id/${product.id}?utm_source=qr&utm_medium=whatsapp&utm_campaign=product_share`,
      facebook: `${baseUrl}/product/id/${product.id}?utm_source=qr&utm_medium=facebook&utm_campaign=product_share`,
      instagram: `${baseUrl}/product/id/${product.id}?utm_source=qr&utm_medium=instagram&utm_campaign=product_share`,
      tiktok: `${baseUrl}/product/id/${product.id}?utm_source=qr&utm_medium=tiktok&utm_campaign=product_share`,
      general: `${baseUrl}/product/id/${product.id}?utm_source=qr&utm_medium=social&utm_campaign=product_share`
    };

    const qrCodes: Record<string, string> = {};
    
    for (const [platform, url] of Object.entries(platforms)) {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      qrCodes[platform] = qrDataUrl;
    }

    sendSuccess(res, {
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      qrCodes,
      urls: platforms,
      downloadUrls: {
        whatsapp: `/api/products/${productId}/qr-code?platform=whatsapp&format=png`,
        facebook: `/api/products/${productId}/qr-code?platform=facebook&format=png`,
        instagram: `/api/products/${productId}/qr-code?platform=instagram&format=png`,
        tiktok: `/api/products/${productId}/qr-code?platform=tiktok&format=png`,
        general: `/api/products/${productId}/qr-code?format=png`
      }
    });
    return;
  } catch (error) {
    logger.error('Error generating QR social kit', { error, productId: req.params.id });
    sendError(res, 'Failed to generate QR social kit', 500);
    return;
  }
}));

export default router;
