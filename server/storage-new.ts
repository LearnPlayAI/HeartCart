/**
 * Raw SQL Storage Interface - Complete Drizzle Replacement
 * 
 * This file completely replaces server/storage.ts with raw SQL implementations
 * to eliminate all Drizzle ORM dependencies and schema mismatches.
 */

import { executeQuery } from './database';
import { logger } from './logger';

// User-related functions
export async function getUserById(id: number) {
  try {
    const result = await executeQuery(
      'SELECT id, username, email, is_admin, is_active, first_name, last_name, full_name, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error fetching user by ID:', error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const result = await executeQuery(
      'SELECT id, username, email, password, is_admin, is_active, first_name, last_name FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error fetching user by email:', error);
    throw error;
  }
}

// Supplier-related functions
export async function getAllSuppliers() {
  try {
    const result = await executeQuery(
      'SELECT * FROM suppliers ORDER BY company_name ASC'
    );
    return result.rows;
  } catch (error) {
    logger.error('Error fetching suppliers:', error);
    throw error;
  }
}

export async function createSupplier(data: any) {
  try {
    const result = await executeQuery(
      `INSERT INTO suppliers (company_name, contact_name, email, phone, address, city, postal_code, country, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.companyName,
        data.contactName,
        data.email,
        data.phone,
        data.address,
        data.city,
        data.postalCode,
        data.country || 'South Africa',
        data.isActive !== false,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating supplier:', error);
    throw error;
  }
}

export async function deleteSupplier(id: number) {
  try {
    const result = await executeQuery(
      'DELETE FROM suppliers WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Error deleting supplier:', error);
    throw error;
  }
}

// Catalog-related functions
export async function getAllCatalogs() {
  try {
    const result = await executeQuery(
      `SELECT c.*, s.company_name as supplier_name 
       FROM catalogs c 
       LEFT JOIN suppliers s ON c.supplier_id = s.id 
       ORDER BY c.name ASC`
    );
    return result.rows;
  } catch (error) {
    logger.error('Error fetching catalogs:', error);
    throw error;
  }
}

export async function createCatalog(data: any) {
  try {
    const result = await executeQuery(
      `INSERT INTO catalogs (name, description, supplier_id, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.name,
        data.description || null,
        data.supplierId,
        data.isActive !== false,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating catalog:', error);
    throw error;
  }
}

export async function deleteCatalog(id: number) {
  try {
    const result = await executeQuery(
      'DELETE FROM catalogs WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Error deleting catalog:', error);
    throw error;
  }
}

// Category-related functions
export async function getAllCategories() {
  try {
    const result = await executeQuery(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    return result.rows;
  } catch (error) {
    logger.error('Error fetching categories:', error);
    throw error;
  }
}

// Product-related functions
export async function getAllProducts(filters: any = {}) {
  try {
    let query = `
      SELECT p.*, c.name as category_name, s.company_name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (filters.activeOnly === 'true') {
      query += ` AND p.is_active = true`;
    }

    if (filters.q) {
      paramCount++;
      query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      params.push(`%${filters.q}%`);
    }

    if (filters.categoryId) {
      paramCount++;
      query += ` AND p.category_id = $${paramCount}`;
      params.push(parseInt(filters.categoryId));
    }

    if (filters.supplierId) {
      paramCount++;
      query += ` AND p.supplier_id = $${paramCount}`;
      params.push(parseInt(filters.supplierId));
    }

    if (filters.catalogId) {
      paramCount++;
      query += ` AND p.catalog_id = $${paramCount}`;
      params.push(parseInt(filters.catalogId));
    }

    query += ` ORDER BY p.created_at DESC`;

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(filters.limit));
    }

    const result = await executeQuery(query, params);
    return result.rows;
  } catch (error) {
    logger.error('Error fetching products:', error);
    throw error;
  }
}

export async function getFeaturedProducts() {
  try {
    const result = await executeQuery(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.is_featured = true AND p.is_active = true 
       ORDER BY p.created_at DESC 
       LIMIT 8`
    );
    return result.rows;
  } catch (error) {
    logger.error('Error fetching featured products:', error);
    throw error;
  }
}

export async function getFlashDeals() {
  try {
    const result = await executeQuery(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.is_flash_deal = true AND p.is_active = true 
       AND (p.flash_deal_end IS NULL OR p.flash_deal_end > NOW())
       ORDER BY p.created_at DESC 
       LIMIT 6`
    );
    return result.rows;
  } catch (error) {
    logger.error('Error fetching flash deals:', error);
    throw error;
  }
}

export async function getRecommendations() {
  try {
    const result = await executeQuery(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.is_active = true 
       ORDER BY RANDOM() 
       LIMIT 4`
    );
    return result.rows;
  } catch (error) {
    logger.error('Error fetching recommendations:', error);
    throw error;
  }
}

// Cart-related functions
export async function getCartItems(userId: number) {
  try {
    const result = await executeQuery(
      `SELECT ci.*, p.name, p.regular_price, p.sale_price, p.on_sale, p.image_urls
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    logger.error('Error fetching cart items:', error);
    throw error;
  }
}

// Attribute-related functions
export async function getAllAttributes() {
  try {
    const result = await executeQuery(
      'SELECT * FROM attributes ORDER BY name ASC'
    );
    return result.rows;
  } catch (error) {
    logger.error('Error fetching attributes:', error);
    throw error;
  }
}

export async function getAttributeOptions(attributeId: number) {
  try {
    const result = await executeQuery(
      'SELECT * FROM attribute_options WHERE attribute_id = $1 ORDER BY value ASC',
      [attributeId]
    );
    return result.rows;
  } catch (error) {
    logger.error('Error fetching attribute options:', error);
    throw error;
  }
}

// Main categories with children for navigation
export async function getMainCategoriesWithChildren() {
  try {
    const result = await executeQuery(
      `SELECT c1.id, c1.name, c1.slug, c1.description,
              COALESCE(
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', c2.id,
                    'name', c2.name,
                    'slug', c2.slug,
                    'description', c2.description
                  )
                ) FILTER (WHERE c2.id IS NOT NULL),
                '[]'
              ) as children
       FROM categories c1
       LEFT JOIN categories c2 ON c2.parent_id = c1.id
       WHERE c1.parent_id IS NULL
       GROUP BY c1.id, c1.name, c1.slug, c1.description
       ORDER BY c1.name ASC`
    );
    return result.rows;
  } catch (error) {
    logger.error('Error fetching main categories with children:', error);
    throw error;
  }
}

// Export a storage interface that matches what the application expects
export const storage = {
  // User methods
  getUserById,
  getUserByEmail,
  
  // Supplier methods
  getAllSuppliers,
  createSupplier,
  deleteSupplier,
  
  // Catalog methods
  getAllCatalogs,
  createCatalog,
  deleteCatalog,
  
  // Category methods
  getAllCategories,
  getMainCategoriesWithChildren,
  
  // Product methods
  getAllProducts,
  getFeaturedProducts,
  getFlashDeals,
  getRecommendations,
  
  // Cart methods
  getCartItems,
  
  // Attribute methods
  getAllAttributes,
  getAttributeOptions,
};

export default storage;