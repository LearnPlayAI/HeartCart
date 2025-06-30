import { Router, Request, Response } from 'express';
import { seoService } from './seo-service';

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
    const productsSitemap = await seoService.generateProductsSitemap();
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=1800'); // Cache for 30 minutes
    res.send(productsSitemap);
  } catch (error) {
    console.error('Error generating products sitemap:', error);
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

/**
 * GET /api/seo/product/:id/structured-data - Get structured data for a product
 */
router.get('/api/seo/product/:id/structured-data', async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    const product = await storage.getProductById(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let category;
    if (product.categoryId) {
      category = await storage.getCategoryById(product.categoryId);
    }

    const { structuredDataService } = await import('./structured-data-service');
    
    const structuredData = structuredDataService.generateProductStructuredData(product, category);
    
    res.json({
      success: true,
      data: structuredData
    });
  } catch (error) {
    console.error('[SEO] Error generating structured data:', error);
    res.status(500).json({ error: 'Failed to generate structured data' });
  }
});

/**
 * GET /api/seo/product/:id/meta-tags - Get meta tags for a product
 */
router.get('/api/seo/product/:id/meta-tags', async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    const product = await storage.getProductById(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let category;
    if (product.categoryId) {
      category = await storage.getCategoryById(product.categoryId);
    }

    const { structuredDataService } = await import('./structured-data-service');
    
    const metaTags = structuredDataService.generateProductMetaTags(product, category);
    const openGraphTags = structuredDataService.generateOpenGraphTags(product, category);
    
    res.json({
      success: true,
      data: {
        metaTags,
        openGraphTags,
        breadcrumbs: structuredDataService.generateBreadcrumbStructuredData([
          { name: 'Home', url: 'https://teemeyou.shop/' },
          { name: category?.name || 'Products', url: `https://teemeyou.shop/category/${category?.slug || 'all'}` },
          { name: product.name, url: product.canonicalUrl || `https://teemeyou.shop/product/id/${product.id}` }
        ])
      }
    });
  } catch (error) {
    console.error('[SEO] Error generating meta tags:', error);
    res.status(500).json({ error: 'Failed to generate meta tags' });
  }
});

/**
 * POST /api/seo/regenerate-sitemaps - Manually regenerate all sitemaps
 */
router.post('/api/seo/regenerate-sitemaps', async (req: Request, res: Response) => {
  try {
    console.log('[SEO] Manual sitemap regeneration triggered');
    
    // Trigger sitemap regeneration by generating them
    await Promise.all([
      seoService.generateSitemapIndex(),
      seoService.generateProductsSitemap(),
      seoService.generatePagesSitemap(),
      seoService.generateCategoriesSitemap()
    ]);
    
    res.json({
      success: true,
      data: {
        message: 'Sitemaps regenerated successfully',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[SEO] Error regenerating sitemaps:', error);
    res.status(500).json({ error: 'Failed to regenerate sitemaps' });
  }
});

export default router;