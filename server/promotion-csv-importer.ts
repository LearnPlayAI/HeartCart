/**
 * Promotion CSV Import Service
 * 
 * Extends the existing mass upload system to support bulk promotion product assignments
 * via CSV files with SKU-based product matching.
 */

import { parse } from 'csv-parse';
import { storage } from './storage';
import type { Product } from '../shared/schema';

interface PromotionCsvRow {
  sku?: string;
  productName?: string;
  discountOverride?: string;
  categoryName?: string;
  supplierName?: string;
  catalogName?: string;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
  addedProducts: number[];
}

interface ImportError {
  row: number;
  sku?: string;
  error: string;
}

export class PromotionCsvImporter {
  /**
   * Import products to promotion from CSV content
   */
  static async importFromCsv(
    promotionId: number,
    csvContent: string,
    options: {
      hasHeaders?: boolean;
      delimiter?: string;
      skipDuplicates?: boolean;
    } = {}
  ): Promise<ImportResult> {
    const { hasHeaders = true, delimiter = ',', skipDuplicates = true } = options;
    
    const result: ImportResult = {
      success: false,
      totalRows: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      addedProducts: []
    };

    try {
      // Verify promotion exists
      const promotion = await storage.getPromotionById(promotionId);
      if (!promotion) {
        throw new Error(`Promotion with ID ${promotionId} not found`);
      }

      // Parse CSV content
      const rows = await this.parseCsvContent(csvContent, { hasHeaders, delimiter });
      result.totalRows = rows.length;

      if (rows.length === 0) {
        throw new Error('No data rows found in CSV file');
      }

      // Get existing promotion products if skipping duplicates
      let existingProductIds: number[] = [];
      if (skipDuplicates) {
        const existingProducts = await storage.getPromotionProducts(promotionId);
        existingProductIds = existingProducts.map(p => p.productId || p.product?.id).filter(Boolean);
      }

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = hasHeaders ? i + 2 : i + 1; // Account for header row in error reporting

        try {
          const productId = await this.findProductBySku(row.sku);
          
          if (!productId) {
            result.errors.push({
              row: rowNumber,
              sku: row.sku,
              error: `Product not found with SKU: ${row.sku}`
            });
            result.errorCount++;
            continue;
          }

          // Skip if already in promotion
          if (skipDuplicates && existingProductIds.includes(productId)) {
            continue;
          }

          // Parse discount override
          let discountOverride: number | undefined;
          if (row.discountOverride) {
            const parsed = parseFloat(row.discountOverride);
            if (!isNaN(parsed)) {
              discountOverride = parsed;
            }
          }

          // Add product to promotion
          await storage.addProductToPromotion(promotionId, productId, discountOverride);
          result.addedProducts.push(productId);
          result.successCount++;

        } catch (error) {
          result.errors.push({
            row: rowNumber,
            sku: row.sku,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          result.errorCount++;
        }
      }

      result.success = result.successCount > 0;
      return result;

    } catch (error) {
      result.errors.push({
        row: 0,
        error: error instanceof Error ? error.message : 'Unknown error during import'
      });
      result.errorCount++;
      return result;
    }
  }

  /**
   * Import products by category from CSV
   */
  static async importByCategoryFromCsv(
    promotionId: number,
    csvContent: string,
    options: {
      hasHeaders?: boolean;
      delimiter?: string;
      includeSubcategories?: boolean;
    } = {}
  ): Promise<ImportResult> {
    const { hasHeaders = true, delimiter = ',', includeSubcategories = false } = options;
    
    const result: ImportResult = {
      success: false,
      totalRows: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      addedProducts: []
    };

    try {
      const rows = await this.parseCsvContent(csvContent, { hasHeaders, delimiter });
      result.totalRows = rows.length;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = hasHeaders ? i + 2 : i + 1;

        try {
          if (!row.categoryName) {
            result.errors.push({
              row: rowNumber,
              error: 'Category name is required'
            });
            result.errorCount++;
            continue;
          }

          const category = await this.findCategoryByName(row.categoryName);
          if (!category) {
            result.errors.push({
              row: rowNumber,
              error: `Category not found: ${row.categoryName}`
            });
            result.errorCount++;
            continue;
          }

          const productIds = await storage.getProductIdsByCategory(category.id, includeSubcategories);
          
          if (productIds.length === 0) {
            result.errors.push({
              row: rowNumber,
              error: `No products found in category: ${row.categoryName}`
            });
            result.errorCount++;
            continue;
          }

          const addedProducts = await storage.bulkAddProductsToPromotion(promotionId, productIds);
          result.addedProducts.push(...productIds);
          result.successCount += addedProducts.length;

        } catch (error) {
          result.errors.push({
            row: rowNumber,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          result.errorCount++;
        }
      }

      result.success = result.successCount > 0;
      return result;

    } catch (error) {
      result.errors.push({
        row: 0,
        error: error instanceof Error ? error.message : 'Unknown error during category import'
      });
      result.errorCount++;
      return result;
    }
  }

  /**
   * Import products by supplier from CSV
   */
  static async importBySupplierFromCsv(
    promotionId: number,
    csvContent: string,
    options: {
      hasHeaders?: boolean;
      delimiter?: string;
    } = {}
  ): Promise<ImportResult> {
    const { hasHeaders = true, delimiter = ',' } = options;
    
    const result: ImportResult = {
      success: false,
      totalRows: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      addedProducts: []
    };

    try {
      const rows = await this.parseCsvContent(csvContent, { hasHeaders, delimiter });
      result.totalRows = rows.length;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = hasHeaders ? i + 2 : i + 1;

        try {
          if (!row.supplierName) {
            result.errors.push({
              row: rowNumber,
              error: 'Supplier name is required'
            });
            result.errorCount++;
            continue;
          }

          const supplier = await this.findSupplierByName(row.supplierName);
          if (!supplier) {
            result.errors.push({
              row: rowNumber,
              error: `Supplier not found: ${row.supplierName}`
            });
            result.errorCount++;
            continue;
          }

          const productIds = await storage.getProductIdsBySupplier(supplier.id);
          
          if (productIds.length === 0) {
            result.errors.push({
              row: rowNumber,
              error: `No products found for supplier: ${row.supplierName}`
            });
            result.errorCount++;
            continue;
          }

          const addedProducts = await storage.bulkAddProductsToPromotion(promotionId, productIds);
          result.addedProducts.push(...productIds);
          result.successCount += addedProducts.length;

        } catch (error) {
          result.errors.push({
            row: rowNumber,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          result.errorCount++;
        }
      }

      result.success = result.successCount > 0;
      return result;

    } catch (error) {
      result.errors.push({
        row: 0,
        error: error instanceof Error ? error.message : 'Unknown error during supplier import'
      });
      result.errorCount++;
      return result;
    }
  }

  /**
   * Generate CSV template for promotion imports
   */
  static generateCsvTemplate(type: 'sku' | 'category' | 'supplier' | 'catalog'): string {
    const templates = {
      sku: 'sku,productName,discountOverride\nPROD001,Sample Product,10\nPROD002,Another Product,15',
      category: 'categoryName,includeSubcategories\nElectronics,true\nClothing,false',
      supplier: 'supplierName\nSupplier A\nSupplier B',
      catalog: 'catalogName\nSummer Collection\nWinter Collection'
    };

    return templates[type] || templates.sku;
  }

  /**
   * Parse CSV content into structured data
   */
  private static parseCsvContent(
    csvContent: string,
    options: { hasHeaders: boolean; delimiter: string }
  ): Promise<PromotionCsvRow[]> {
    return new Promise((resolve, reject) => {
      const rows: PromotionCsvRow[] = [];
      const { hasHeaders, delimiter } = options;

      parse(csvContent, {
        delimiter,
        columns: hasHeaders ? true : ['sku', 'productName', 'discountOverride'],
        skip_empty_lines: true,
        trim: true
      })
      .on('data', (row: any) => {
        rows.push({
          sku: row.sku?.toString().trim(),
          productName: row.productName?.toString().trim(),
          discountOverride: row.discountOverride?.toString().trim(),
          categoryName: row.categoryName?.toString().trim(),
          supplierName: row.supplierName?.toString().trim(),
          catalogName: row.catalogName?.toString().trim()
        });
      })
      .on('error', (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      })
      .on('end', () => {
        resolve(rows);
      });
    });
  }

  /**
   * Find product by SKU
   */
  private static async findProductBySku(sku?: string): Promise<number | null> {
    if (!sku) return null;

    try {
      const products = await storage.searchProducts({ sku });
      return products.length > 0 ? products[0].id : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Find category by name
   */
  private static async findCategoryByName(name: string): Promise<{ id: number; name: string } | null> {
    try {
      const categories = await storage.getCategories();
      return categories.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Find supplier by name
   */
  private static async findSupplierByName(name: string): Promise<{ id: number; name: string } | null> {
    try {
      const suppliers = await storage.getSuppliers();
      return suppliers.find(s => s.name.toLowerCase() === name.toLowerCase()) || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Find catalog by name
   */
  private static async findCatalogByName(name: string): Promise<{ id: number; name: string } | null> {
    try {
      const catalogs = await storage.getCatalogs();
      return catalogs.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
    } catch (error) {
      return null;
    }
  }
}