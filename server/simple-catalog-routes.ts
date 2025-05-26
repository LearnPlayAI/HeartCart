import { Router } from "express";
import { db } from "./db";
import { catalogs, suppliers } from "../shared/schema";
import { eq } from "drizzle-orm";

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
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, supplierId));

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: { message: "Supplier not found" },
      });
    }

    // Create catalog with only the required fields
    const catalogData = {
      name: name.trim(),
      description: description.trim(),
      supplierId: parseInt(supplierId, 10),
      isActive: Boolean(isActive),
      defaultMarkupPercentage: parseFloat(defaultMarkupPercentage) || 0,
      freeShipping: Boolean(freeShipping),
    };

    // Add dates only if provided
    if (startDate) {
      catalogData.startDate = new Date(startDate).toISOString();
    }
    if (endDate) {
      catalogData.endDate = new Date(endDate).toISOString();
    }

    const [newCatalog] = await db
      .insert(catalogs)
      .values(catalogData)
      .returning();

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