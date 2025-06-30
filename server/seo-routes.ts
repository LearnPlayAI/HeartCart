import { Router, Request, Response } from 'express';
import { seoService } from './seo-service';
import { db } from './db';
import { products } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

/**
 * GET /sitemap.xml - Main sitemap index
 */
router.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemapIndex = await seoService.generateSitemapIndex();
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(sitemapIndex);
  } catch (error) {
    console.error('Error generating sitemap index:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * GET /sitemap-products.xml - Products sitemap
 */
router.get('/sitemap-products.xml', async (req: Request, res: Response) => {
  try {
    console.log('==========================================');
    console.log('[SEO ROUTE] SITEMAP REQUEST RECEIVED - Starting generation...');
    console.log('==========================================');
    
    const productsSitemap = await seoService.generateProductsSitemap();
    
    console.log('[SEO ROUTE] Sitemap generation completed, sending response...');
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Generated-At', new Date().toISOString());
    res.send(productsSitemap);
  } catch (error) {
    console.error('ERROR in sitemap generation:', error);
    res.status(500).send('Error generating products sitemap');
  }
});

/**
 * GET /sitemap-pages.xml - Static pages sitemap
 */
router.get('/sitemap-pages.xml', async (req: Request, res: Response) => {
  try {
    const pagesSitemap = await seoService.generatePagesSitemap();
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=7200'); // Cache for 2 hours
    res.send(pagesSitemap);
  } catch (error) {
    console.error('Error generating pages sitemap:', error);
    res.status(500).send('Error generating pages sitemap');
  }
});

/**
 * GET /sitemap-categories.xml - Categories sitemap
 */
router.get('/sitemap-categories.xml', async (req: Request, res: Response) => {
  try {
    const categoriesSitemap = await seoService.generateCategoriesSitemap();
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(categoriesSitemap);
  } catch (error) {
    console.error('Error generating categories sitemap:', error);
    res.status(500).send('Error generating categories sitemap');
  }
});

/**
 * GET /robots.txt - Robots.txt file
 */
router.get('/robots.txt', async (req: Request, res: Response) => {
  try {
    const robotsTxt = seoService.generateRobotsTxt();
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(robotsTxt);
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    res.status(500).send('Error generating robots.txt');
  }
});

/**
 * GET /api/seo/product/:id - Product SEO metadata (for frontend)
 */
router.get('/api/seo/product/:id', async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      res.status(400).json({ success: false, error: 'Invalid product ID' });
      return;
    }

    // Get product data from database - will implement this method
    // For now, return a basic response structure
    res.json({ 
      success: true, 
      data: { 
        productId,
        message: 'SEO metadata endpoint ready' 
      } 
    });
  } catch (error) {
    console.error('Error fetching product SEO metadata:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch SEO metadata' });
  }
});

/**
 * GET /api/seo/debug-urls - Debug URL format issue
 */
router.get('/api/seo/debug-urls', async (req: Request, res: Response) => {
  try {
    console.log('[DEBUG] Starting URL debugging...');
    
    // Direct database query
    const rawResults = await db.execute(`SELECT id, name, image_url FROM products WHERE is_active = true AND "supplierAvailable" = true LIMIT 3`);
    console.log('[DEBUG] Raw DB results:', JSON.stringify(rawResults.rows, null, 2));
    
    // Drizzle query
    const drizzleResults = await db
      .select({
        id: products.id,
        name: products.name,
        imageUrl: products.imageUrl
      })
      .from(products)
      .where(and(
        eq(products.isActive, true),
        eq(products.supplierAvailable, true)
      ))
      .limit(3);
    
    console.log('[DEBUG] Drizzle results:', JSON.stringify(drizzleResults, null, 2));
    
    res.json({
      success: true,
      data: {
        rawQuery: rawResults.rows,
        drizzleQuery: drizzleResults,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error debugging URLs:', error);
    res.status(500).json({ success: false, error: 'Failed to debug URLs' });
  }
});

/**
 * GET /api/seo/sitemap-status - Get sitemap generation status
 */
router.get('/api/seo/sitemap-status', async (req: Request, res: Response) => {
  try {
    const lastModified = await seoService.getSitemapLastModified();
    
    res.json({
      success: true,
      data: {
        lastModified,
        sitemaps: [
          { name: 'Main Index', url: '/sitemap.xml' },
          { name: 'Products', url: '/sitemap-products.xml' },
          { name: 'Pages', url: '/sitemap-pages.xml' },
          { name: 'Categories', url: '/sitemap-categories.xml' }
        ],
        robotsTxt: '/robots.txt'
      }
    });
  } catch (error) {
    console.error('Error getting sitemap status:', error);
    res.status(500).json({ success: false, error: 'Failed to get sitemap status' });
  }
});

export default router;