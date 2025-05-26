import { Router } from "express";
import { executeQuery } from "./database";
import { CreateCatalogInput } from "../shared/database-types";

const router = Router();

// Simple catalog creation route
router.post("/api/catalogs/create", async (req, res) => {
  try {
    const {
      name,
      description,
      supplierId,
      isActive = true,
      startDate,
      endDate,
      defaultMarkupPercentage = 0,
      freeShipping = false,
    } = req.body;

    // Basic validation
    if (!name || !description || !supplierId) {
      return res.status(400).json({
        success: false,
        error: { message: "Name, description, and supplier are required" },
      });
    }

    // Verify supplier exists
    const supplierResult = await executeQuery(
      'SELECT id FROM suppliers WHERE id = $1',
      [supplierId]
    );

    if (supplierResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: "Supplier not found" },
      });
    }

    // Create catalog using raw SQL
    const query = `
      INSERT INTO catalogs (
        name, description, supplier_id, is_active, 
        default_markup_percentage, free_shipping, start_date, end_date,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      name.trim(),
      description.trim(),
      parseInt(supplierId, 10),
      Boolean(isActive),
      parseFloat(defaultMarkupPercentage) || 0,
      Boolean(freeShipping),
      startDate ? new Date(startDate).toISOString() : null,
      endDate ? new Date(endDate).toISOString() : null,
    ];

    const result = await executeQuery(query, values);
    const newCatalog = result.rows[0];

    return res.status(201).json({
      success: true,
      data: newCatalog,
      message: `Catalog "${newCatalog.name}" created successfully`,
    });
  } catch (error) {
    console.error("Error creating catalog:", error);
    return res.status(500).json({
      success: false,
      error: { message: "Failed to create catalog" },
    });
  }
});

export default router;