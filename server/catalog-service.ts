/**
 * Raw SQL Catalog Service for TeeMeYou
 * 
 * This service handles all catalog operations using raw SQL queries
 * to avoid camelCase/snake_case conflicts with Drizzle ORM.
 */

import { pool } from './db';

export interface CatalogData {
  id?: number;
  name: string;
  description?: string | null;
  supplier_id: number;
  default_markup_percentage?: number;
  is_active?: boolean;
  cover_image?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface CatalogWithSupplier extends CatalogData {
  supplier_name?: string;
}

class CatalogService {
  /**
   * Get all catalogs with supplier information
   */
  async getAllCatalogs(activeOnly: boolean = false, supplierId?: number): Promise<CatalogWithSupplier[]> {
    try {
      let query = `
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
      `;
      
      const conditions: string[] = [];
      const params: any[] = [];
      
      if (activeOnly) {
        conditions.push('c.is_active = $' + (params.length + 1));
        params.push(true);
      }
      
      if (supplierId) {
        conditions.push('c.supplier_id = $' + (params.length + 1));
        params.push(supplierId);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY c.name ASC';
      
      const client = await pool.connect();
      try {
        const result = await client.query(query, params);
        return result.rows as CatalogWithSupplier[];
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching catalogs:', error);
      throw new Error('Failed to fetch catalogs');
    }
  }

  /**
   * Get a catalog by ID
   */
  async getCatalogById(id: number): Promise<CatalogWithSupplier | null> {
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
        WHERE c.id = $1
      `;
      
      const client = await pool.connect();
      try {
        const result = await client.query(query, [id]);
        return result.rows[0] as CatalogWithSupplier || null;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching catalog by ID:', error);
      throw new Error('Failed to fetch catalog');
    }
  }

  /**
   * Create a new catalog
   */
  async createCatalog(catalogData: Omit<CatalogData, 'id' | 'created_at' | 'updated_at'>): Promise<CatalogData> {
    try {
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
        RETURNING id, name, description, supplier_id, default_markup_percentage, is_active, cover_image, tags, start_date, end_date, created_at, updated_at
      `;
      
      const now = new Date().toISOString();
      
      console.log('Creating catalog with data:', catalogData);
      console.log('SQL Query:', query);
      
      const args = [
        catalogData.name,
        catalogData.description || null,
        catalogData.supplier_id,
        catalogData.default_markup_percentage || 0,
        catalogData.is_active ?? true,
        catalogData.cover_image || null,
        catalogData.tags ? JSON.stringify(catalogData.tags) : null,
        catalogData.start_date || null,
        catalogData.end_date || null,
        now,
        now
      ];
      
      console.log('SQL Args:', args);
      console.log('Args length:', args.length);
      
      const client = await pool.connect();
      try {
        const result = await client.query(query, args);
        return result.rows[0] as CatalogData;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating catalog:', error);
      throw new Error('Failed to create catalog');
    }
  }

  /**
   * Update a catalog
   */
  async updateCatalog(id: number, catalogData: Partial<Omit<CatalogData, 'id' | 'created_at'>>): Promise<CatalogData | null> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      if (catalogData.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        params.push(catalogData.name);
      }
      
      if (catalogData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        params.push(catalogData.description);
      }
      
      if (catalogData.supplier_id !== undefined) {
        updateFields.push(`supplier_id = $${paramIndex++}`);
        params.push(catalogData.supplier_id);
      }
      
      if (catalogData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        params.push(catalogData.is_active);
      }
      
      if (catalogData.cover_image !== undefined) {
        updateFields.push(`cover_image = $${paramIndex++}`);
        params.push(catalogData.cover_image);
      }
      
      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }
      
      updateFields.push(`updated_at = $${paramIndex++}`);
      params.push(new Date().toISOString());
      
      params.push(id); // Add the ID parameter last
      
      const query = `
        UPDATE catalogs 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, name, description, supplier_id, default_markup_percentage, is_active, cover_image, tags, start_date, end_date, created_at, updated_at
      `;
      
      const client = await pool.connect();
      try {
        const result = await client.query(query, params);
        return result.rows[0] as CatalogData || null;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating catalog:', error);
      throw new Error('Failed to update catalog');
    }
  }

  /**
   * Delete a catalog
   */
  async deleteCatalog(id: number): Promise<boolean> {
    try {
      const query = 'DELETE FROM catalogs WHERE id = $1';
      
      const result = await db.execute({
        sql: query,
        args: [id]
      });
      
      return result.rowsAffected > 0;
    } catch (error) {
      console.error('Error deleting catalog:', error);
      throw new Error('Failed to delete catalog');
    }
  }

  /**
   * Get catalogs by supplier ID
   */
  async getCatalogsBySupplier(supplierId: number): Promise<CatalogData[]> {
    try {
      const query = `
        SELECT id, name, description, supplier_id, is_active, image_url, created_at, updated_at
        FROM catalogs 
        WHERE supplier_id = $1
        ORDER BY name ASC
      `;
      
      const result = await db.execute({
        sql: query,
        args: [supplierId]
      });
      
      return result.rows as CatalogData[];
    } catch (error) {
      console.error('Error fetching catalogs by supplier:', error);
      throw new Error('Failed to fetch catalogs by supplier');
    }
  }

  /**
   * Check if a catalog name exists for a supplier
   */
  async catalogNameExists(name: string, supplierId: number, excludeId?: number): Promise<boolean> {
    try {
      let query = `
        SELECT COUNT(*) as count
        FROM catalogs 
        WHERE LOWER(name) = LOWER($1) AND supplier_id = $2
      `;
      
      const params = [name, supplierId];
      
      if (excludeId) {
        query += ' AND id != $3';
        params.push(excludeId);
      }
      
      const result = await db.execute({
        sql: query,
        args: params
      });
      
      const count = (result.rows[0] as any).count;
      return parseInt(count) > 0;
    } catch (error) {
      console.error('Error checking catalog name existence:', error);
      throw new Error('Failed to check catalog name');
    }
  }
}

export const catalogService = new CatalogService();