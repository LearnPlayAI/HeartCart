/**
 * Raw SQL Attribute Service
 * Replaces Drizzle-based attribute operations with direct SQL queries
 */

import { db } from "./db";

export interface Attribute {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  attribute_type: string;
  is_required: boolean;
  is_filterable: boolean;
  is_comparable: boolean;
  is_swatch: boolean;
  display_in_product_summary: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface AttributeOption {
  id: number;
  attribute_id: number;
  value: string;
  display_value: string;
  metadata: any;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateAttributeData {
  name: string;
  display_name: string;
  description?: string | null;
  attribute_type?: string;
  is_required?: boolean;
  is_filterable?: boolean;
  is_comparable?: boolean;
  is_swatch?: boolean;
  display_in_product_summary?: boolean;
  sort_order?: number;
}

export interface CreateAttributeOptionData {
  attribute_id: number;
  value: string;
  display_value?: string;
  metadata?: any;
  sort_order?: number;
}

export class AttributeService {
  // Get all attributes
  async getAllAttributes(): Promise<Attribute[]> {
    const result = await db.execute(`
      SELECT 
        id, name, display_name, description, attribute_type,
        is_required, is_filterable, is_comparable, is_swatch,
        display_in_product_summary, sort_order, created_at, updated_at
      FROM attributes 
      ORDER BY sort_order ASC, name ASC
    `);
    return result.rows as Attribute[];
  }

  // Get attribute by ID
  async getAttributeById(id: number): Promise<Attribute | null> {
    const result = await db.execute(`
      SELECT 
        id, name, display_name, description, attribute_type,
        is_required, is_filterable, is_comparable, is_swatch,
        display_in_product_summary, sort_order, created_at, updated_at
      FROM attributes 
      WHERE id = $1
    `, [id]);
    
    return result.rows.length > 0 ? result.rows[0] as Attribute : null;
  }

  // Create new attribute
  async createAttribute(data: CreateAttributeData): Promise<Attribute> {
    const result = await db.execute(`
      INSERT INTO attributes (
        name, display_name, description, attribute_type,
        is_required, is_filterable, is_comparable, is_swatch,
        display_in_product_summary, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id, name, display_name, description, attribute_type,
        is_required, is_filterable, is_comparable, is_swatch,
        display_in_product_summary, sort_order, created_at, updated_at
    `, [
      data.name,
      data.display_name,
      data.description || null,
      data.attribute_type || 'select',
      data.is_required || false,
      data.is_filterable || false,
      data.is_comparable || false,
      data.is_swatch || false,
      data.display_in_product_summary || false,
      data.sort_order || 0
    ]);
    
    return result.rows[0] as Attribute;
  }

  // Update attribute
  async updateAttribute(id: number, data: Partial<CreateAttributeData>): Promise<Attribute | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.display_name !== undefined) {
      updateFields.push(`display_name = $${paramCount++}`);
      values.push(data.display_name);
    }
    if (data.description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.attribute_type !== undefined) {
      updateFields.push(`attribute_type = $${paramCount++}`);
      values.push(data.attribute_type);
    }
    if (data.is_required !== undefined) {
      updateFields.push(`is_required = $${paramCount++}`);
      values.push(data.is_required);
    }
    if (data.is_filterable !== undefined) {
      updateFields.push(`is_filterable = $${paramCount++}`);
      values.push(data.is_filterable);
    }
    if (data.is_comparable !== undefined) {
      updateFields.push(`is_comparable = $${paramCount++}`);
      values.push(data.is_comparable);
    }
    if (data.is_swatch !== undefined) {
      updateFields.push(`is_swatch = $${paramCount++}`);
      values.push(data.is_swatch);
    }
    if (data.display_in_product_summary !== undefined) {
      updateFields.push(`display_in_product_summary = $${paramCount++}`);
      values.push(data.display_in_product_summary);
    }
    if (data.sort_order !== undefined) {
      updateFields.push(`sort_order = $${paramCount++}`);
      values.push(data.sort_order);
    }

    if (updateFields.length === 0) {
      return this.getAttributeById(id);
    }

    values.push(id);
    
    const result = await db.execute(`
      UPDATE attributes 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id, name, display_name, description, attribute_type,
        is_required, is_filterable, is_comparable, is_swatch,
        display_in_product_summary, sort_order, created_at, updated_at
    `, values);
    
    return result.rows.length > 0 ? result.rows[0] as Attribute : null;
  }

  // Delete attribute
  async deleteAttribute(id: number): Promise<boolean> {
    try {
      // First delete all related options
      await db.execute(`DELETE FROM attribute_options WHERE attribute_id = $1`, [id]);
      
      // Then delete the attribute itself
      const result = await db.execute(`DELETE FROM attributes WHERE id = $1`, [id]);
      return true;
    } catch (error) {
      console.error(`Error deleting attribute ${id}:`, error);
      throw error;
    }
  }

  // Get attribute options
  async getAttributeOptions(attributeId: number): Promise<AttributeOption[]> {
    const result = await db.execute(`
      SELECT 
        id, attribute_id, value, display_value, metadata, 
        sort_order, created_at, updated_at
      FROM attribute_options 
      WHERE attribute_id = $1
      ORDER BY sort_order ASC, value ASC
    `, [attributeId]);
    
    return result.rows as AttributeOption[];
  }

  // Create attribute option
  async createAttributeOption(data: CreateAttributeOptionData): Promise<AttributeOption> {
    const result = await db.execute(`
      INSERT INTO attribute_options (
        attribute_id, value, display_value, metadata, sort_order
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id, attribute_id, value, display_value, metadata, 
        sort_order, created_at, updated_at
    `, [
      data.attribute_id,
      data.value,
      data.display_value || data.value,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.sort_order || 0
    ]);
    
    return result.rows[0] as AttributeOption;
  }

  // Update attribute option
  async updateAttributeOption(id: number, data: Partial<CreateAttributeOptionData>): Promise<AttributeOption | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.value !== undefined) {
      updateFields.push(`value = $${paramCount++}`);
      values.push(data.value);
    }
    if (data.display_value !== undefined) {
      updateFields.push(`display_value = $${paramCount++}`);
      values.push(data.display_value);
    }
    if (data.metadata !== undefined) {
      updateFields.push(`metadata = $${paramCount++}`);
      values.push(data.metadata ? JSON.stringify(data.metadata) : null);
    }
    if (data.sort_order !== undefined) {
      updateFields.push(`sort_order = $${paramCount++}`);
      values.push(data.sort_order);
    }

    if (updateFields.length === 0) {
      const result = await db.execute(`
        SELECT 
          id, attribute_id, value, display_value, metadata, 
          sort_order, created_at, updated_at
        FROM attribute_options WHERE id = $1
      `, [id]);
      return result.rows.length > 0 ? result.rows[0] as AttributeOption : null;
    }

    values.push(id);
    
    const result = await db.execute(`
      UPDATE attribute_options 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id, attribute_id, value, display_value, metadata, 
        sort_order, created_at, updated_at
    `, values);
    
    return result.rows.length > 0 ? result.rows[0] as AttributeOption : null;
  }

  // Delete attribute option
  async deleteAttributeOption(id: number): Promise<boolean> {
    try {
      await db.execute(`DELETE FROM attribute_options WHERE id = $1`, [id]);
      return true;
    } catch (error) {
      console.error(`Error deleting attribute option ${id}:`, error);
      throw error;
    }
  }

  // Get attributes with options
  async getAttributesWithOptions(): Promise<(Attribute & { options: AttributeOption[] })[]> {
    const attributes = await this.getAllAttributes();
    
    const attributesWithOptions = await Promise.all(
      attributes.map(async (attr) => {
        const options = await this.getAttributeOptions(attr.id);
        return {
          ...attr,
          options
        };
      })
    );
    
    return attributesWithOptions;
  }
}

export const attributeService = new AttributeService();