/**
 * Simplified Catalog Service for TeeMeYou
 * 
 * This service handles catalog operations using direct PostgreSQL queries
 * that are perfectly aligned with the actual database schema.
 */

import { pool } from './db';

export interface SimpleCatalogData {
  id?: number;
  name: string;
  description?: string | null;
  supplier_id: number;
  default_markup_percentage?: number;
  is_active?: boolean;
  cover_image?: string | null;
  tags?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SimpleCatalogWithSupplier extends SimpleCatalogData {
  supplier_name?: string;
}

class SimpleCatalogService {
  /**
   * Get all catalogs with supplier information
   */
  async getAllCatalogs(): Promise<SimpleCatalogWithSupplier[]> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          c.id,
          c.name,
          c.description,
          c.supplier_id,
          c.default_markup_percentage,
          c.is_active,
          c.cover_image,
          c.tags,
          c.created_at,
          c.updated_at,
          c.start_date,
          c.end_date,
          s.name as supplier_name
        FROM catalogs c
        LEFT JOIN suppliers s ON c.supplier_id = s.id
        ORDER BY c.name ASC
      `;
      
      const result = await client.query(query);
      return result.rows as SimpleCatalogWithSupplier[];
    } finally {
      client.release();
    }
  }

  /**
   * Create a new catalog
   */
  async createCatalog(catalogData: Omit<SimpleCatalogData, 'id' | 'created_at' | 'updated_at'>): Promise<SimpleCatalogData> {
    const client = await pool.connect();
    try {
      const now = new Date().toISOString();
      
      const query = `
        INSERT INTO catalogs (
          name, 
          description, 
          supplier_id, 
          default_markup_percentage,
          is_active, 
          cover_image, 
          tags,
          start_date,
          end_date,
          created_at, 
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const args = [
        catalogData.name,
        catalogData.description || null,
        catalogData.supplier_id,
        catalogData.default_markup_percentage || 0,
        catalogData.is_active ?? true,
        catalogData.cover_image || null,
        catalogData.tags || null,
        catalogData.start_date || null,
        catalogData.end_date || null,
        now,
        now
      ];
      
      const result = await client.query(query, args);
      return result.rows[0] as SimpleCatalogData;
    } finally {
      client.release();
    }
  }

  /**
   * Check if catalog name exists for a supplier
   */
  async catalogNameExists(name: string, supplierId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      const query = 'SELECT id FROM catalogs WHERE name = $1 AND supplier_id = $2';
      const result = await client.query(query, [name, supplierId]);
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }
}

export const simpleCatalogService = new SimpleCatalogService();