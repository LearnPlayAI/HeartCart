/**
 * SEO Automation Hooks
 * Triggers sitemap updates when products/categories are modified
 */

import { seoService } from './seo-service';

export class SEOAutomationHooks {
  private static instance: SEOAutomationHooks;
  private sitemapRegenerationTimer: NodeJS.Timeout | null = null;

  static getInstance(): SEOAutomationHooks {
    if (!SEOAutomationHooks.instance) {
      SEOAutomationHooks.instance = new SEOAutomationHooks();
    }
    return SEOAutomationHooks.instance;
  }

  /**
   * Trigger sitemap regeneration after product changes
   * Uses debouncing to avoid excessive regeneration
   */
  async triggerSitemapUpdate(reason: string = 'Product/Category modified'): Promise<void> {
    try {
      console.log(`[SEO Automation] Sitemap update triggered: ${reason}`);

      // Clear existing timer to debounce multiple rapid changes
      if (this.sitemapRegenerationTimer) {
        clearTimeout(this.sitemapRegenerationTimer);
      }

      // Debounce sitemap regeneration by 30 seconds
      this.sitemapRegenerationTimer = setTimeout(async () => {
        try {
          console.log('[SEO Automation] Regenerating sitemaps...');
          
          await Promise.all([
            seoService.generateSitemapIndex(),
            seoService.generateProductsSitemap(),
            seoService.generateCategoriesSitemap()
          ]);
          
          console.log('[SEO Automation] Sitemaps regenerated successfully');
        } catch (error) {
          console.error('[SEO Automation] Failed to regenerate sitemaps:', error);
        }
      }, 30000); // 30 second debounce
      
    } catch (error) {
      console.error('[SEO Automation] Error triggering sitemap update:', error);
    }
  }

  /**
   * Hook for product creation/update
   */
  async onProductModified(productId: number, action: 'created' | 'updated' | 'deleted'): Promise<void> {
    await this.triggerSitemapUpdate(`Product ${productId} ${action}`);
  }

  /**
   * Hook for category creation/update
   */
  async onCategoryModified(categoryId: number, action: 'created' | 'updated' | 'deleted'): Promise<void> {
    await this.triggerSitemapUpdate(`Category ${categoryId} ${action}`);
  }

  /**
   * Hook for product status changes (active/inactive)
   */
  async onProductStatusChanged(productId: number, newStatus: string): Promise<void> {
    await this.triggerSitemapUpdate(`Product ${productId} status changed to ${newStatus}`);
  }

  /**
   * Force immediate sitemap regeneration (for admin use)
   */
  async forceRegenerateAll(): Promise<void> {
    try {
      console.log('[SEO Automation] Force regenerating all sitemaps...');
      
      // Clear any pending timer
      if (this.sitemapRegenerationTimer) {
        clearTimeout(this.sitemapRegenerationTimer);
        this.sitemapRegenerationTimer = null;
      }

      await Promise.all([
        seoService.generateSitemapIndex(),
        seoService.generateProductsSitemap(),
        seoService.generatePagesSitemap(),
        seoService.generateCategoriesSitemap()
      ]);
      
      console.log('[SEO Automation] Force regeneration completed successfully');
    } catch (error) {
      console.error('[SEO Automation] Force regeneration failed:', error);
      throw error;
    }
  }
}

export const seoAutomationHooks = SEOAutomationHooks.getInstance();