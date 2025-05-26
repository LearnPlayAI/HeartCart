import express, { type Request, Response } from "express";
import { executeQuery } from "./database";
import { Supplier, Catalog, Category, User, Product, CreateSupplierInput, CreateCatalogInput } from "../shared/database-types";
import { isAuthenticated, isAdmin } from "./auth-middleware";
import asyncHandler from "express-async-handler";

const router = express.Router();

// Supplier routes
router.get("/api/suppliers", asyncHandler(async (req: Request, res: Response) => {
  const { activeOnly = "false", q = "" } = req.query;
  
  let query = "SELECT * FROM suppliers";
  const params: any[] = [];
  const conditions: string[] = [];

  if (activeOnly === "true") {
    conditions.push("is_active = true");
  }

  if (q) {
    conditions.push("name ILIKE $" + (params.length + 1));
    params.push(`%${q}%`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY name ASC";

  const result = await executeQuery(query, params);
  
  res.json({
    success: true,
    data: result.rows,
    meta: { count: result.rows.length }
  });
}));

router.post("/api/suppliers", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    email,
    phone,
    contact_name,
    address,
    notes,
    website,
    is_active = true
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({
      success: false,
      error: { message: "Supplier name is required" }
    });
  }

  const query = `
    INSERT INTO suppliers (
      name, email, phone, contact_name, address, notes, website, is_active,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING *
  `;

  const values = [
    name.trim(),
    email || null,
    phone || null,
    contact_name || null,
    address || null,
    notes || null,
    website || null,
    Boolean(is_active)
  ];

  const result = await executeQuery(query, values);
  const newSupplier = result.rows[0];

  res.status(201).json({
    success: true,
    data: newSupplier,
    message: `Supplier "${newSupplier.name}" created successfully`
  });
}));

router.delete("/api/suppliers/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if supplier exists
  const checkResult = await executeQuery(
    'SELECT name FROM suppliers WHERE id = $1',
    [id]
  );

  if (checkResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: { message: "Supplier not found" }
    });
  }

  const supplierName = checkResult.rows[0].name;

  // Delete the supplier
  await executeQuery('DELETE FROM suppliers WHERE id = $1', [id]);

  res.json({
    success: true,
    message: `Supplier "${supplierName}" deleted successfully`
  });
}));

// Catalog routes
router.get("/api/catalogs", asyncHandler(async (req: Request, res: Response) => {
  const { activeOnly = "false", q = "", supplierId } = req.query;
  
  let query = `
    SELECT c.*, s.name as supplier_name 
    FROM catalogs c 
    LEFT JOIN suppliers s ON c.supplier_id = s.id
  `;
  const params: any[] = [];
  const conditions: string[] = [];

  if (activeOnly === "true") {
    conditions.push("c.is_active = true");
  }

  if (q) {
    conditions.push("c.name ILIKE $" + (params.length + 1));
    params.push(`%${q}%`);
  }

  if (supplierId) {
    conditions.push("c.supplier_id = $" + (params.length + 1));
    params.push(supplierId);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY c.name ASC";

  const result = await executeQuery(query, params);
  
  res.json({
    success: true,
    data: result.rows,
    meta: { count: result.rows.length }
  });
}));

router.delete("/api/catalogs/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if catalog exists
  const checkResult = await executeQuery(
    'SELECT name FROM catalogs WHERE id = $1',
    [id]
  );

  if (checkResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: { message: "Catalog not found" }
    });
  }

  const catalogName = checkResult.rows[0].name;

  // Delete the catalog
  await executeQuery('DELETE FROM catalogs WHERE id = $1', [id]);

  res.json({
    success: true,
    message: `Catalog "${catalogName}" deleted successfully`
  });
}));

// Category routes
router.get("/api/categories", asyncHandler(async (req: Request, res: Response) => {
  const query = "SELECT * FROM categories ORDER BY sort_order ASC, name ASC";
  const result = await executeQuery(query);
  
  res.json({
    success: true,
    data: result.rows
  });
}));

// Product routes
router.get("/api/products", asyncHandler(async (req: Request, res: Response) => {
  const { 
    activeOnly = "false", 
    q = "", 
    categoryId, 
    supplierId, 
    catalogId,
    page = "1",
    limit = "20"
  } = req.query;
  
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  
  let query = `
    SELECT p.*, c.name as category_name, s.name as supplier_name, cat.name as catalog_name
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN catalogs cat ON p.catalog_id = cat.id
  `;
  const params: any[] = [];
  const conditions: string[] = [];

  if (activeOnly === "true") {
    conditions.push("p.is_active = true");
  }

  if (q) {
    conditions.push("(p.name ILIKE $" + (params.length + 1) + " OR p.sku ILIKE $" + (params.length + 1) + ")");
    params.push(`%${q}%`);
  }

  if (categoryId) {
    conditions.push("p.category_id = $" + (params.length + 1));
    params.push(categoryId);
  }

  if (supplierId) {
    conditions.push("p.supplier_id = $" + (params.length + 1));
    params.push(supplierId);
  }

  if (catalogId) {
    conditions.push("p.catalog_id = $" + (params.length + 1));
    params.push(catalogId);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY p.name ASC";
  query += " LIMIT $" + (params.length + 1) + " OFFSET $" + (params.length + 2);
  params.push(parseInt(limit as string), offset);

  const result = await executeQuery(query, params);
  
  // Get total count
  let countQuery = "SELECT COUNT(*) FROM products p";
  if (conditions.length > 0) {
    countQuery += " WHERE " + conditions.join(" AND ");
  }
  const countResult = await executeQuery(countQuery, params.slice(0, -2)); // Remove limit and offset
  
  res.json({
    success: true,
    data: result.rows,
    meta: { 
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    }
  });
}));

// User authentication routes
router.get("/api/user", asyncHandler(async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.json({ success: true, data: null });
  }

  const result = await executeQuery(
    'SELECT id, username, email, is_admin, is_active, first_name, last_name FROM users WHERE id = $1',
    [req.session.userId]
  );

  if (result.rows.length === 0) {
    req.session.destroy(() => {});
    return res.json({ success: true, data: null });
  }

  res.json({ success: true, data: result.rows[0] });
}));

// Cart routes
router.get("/api/cart", asyncHandler(async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.json({ success: true, data: [], meta: { count: 0, total: 0 } });
  }

  const query = `
    SELECT ci.*, p.name, p.regular_price, p.sale_price, p.on_sale, p.image_urls
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = $1
    ORDER BY ci.created_at DESC
  `;

  const result = await executeQuery(query, [req.session.userId]);
  
  const total = result.rows.reduce((sum, item) => {
    const price = item.on_sale && item.sale_price ? item.sale_price : item.regular_price;
    return sum + (price * item.quantity);
  }, 0);

  res.json({
    success: true,
    data: result.rows,
    meta: { count: result.rows.length, total }
  });
}));

export async function registerRoutes(app: express.Application): Promise<void> {
  app.use(router);
}