import { Router } from "express";
import { storage } from "./storage";
import { attributeDiscountRules, insertAttributeDiscountRuleSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all attribute discount rules
router.get("/attribute-discount-rules", async (req, res) => {
  try {
    const rules = await storage.getAllAttributeDiscountRules();
    res.json(rules);
  } catch (error) {
    console.error("Error fetching attribute discount rules:", error);
    res.status(500).json({ error: "Failed to fetch attribute discount rules" });
  }
});

// Get attribute discount rules by product
router.get("/attribute-discount-rules/product/:productId", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    
    const rules = await storage.getAttributeDiscountRulesByProduct(productId);
    res.json(rules);
  } catch (error) {
    console.error("Error fetching product attribute discount rules:", error);
    res.status(500).json({ error: "Failed to fetch product attribute discount rules" });
  }
});

// Get attribute discount rules by category
router.get("/attribute-discount-rules/category/:categoryId", async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }
    
    const rules = await storage.getAttributeDiscountRulesByCategory(categoryId);
    res.json(rules);
  } catch (error) {
    console.error("Error fetching category attribute discount rules:", error);
    res.status(500).json({ error: "Failed to fetch category attribute discount rules" });
  }
});

// Get attribute discount rules by catalog
router.get("/attribute-discount-rules/catalog/:catalogId", async (req, res) => {
  try {
    const catalogId = parseInt(req.params.catalogId);
    if (isNaN(catalogId)) {
      return res.status(400).json({ error: "Invalid catalog ID" });
    }
    
    const rules = await storage.getAttributeDiscountRulesByCatalog(catalogId);
    res.json(rules);
  } catch (error) {
    console.error("Error fetching catalog attribute discount rules:", error);
    res.status(500).json({ error: "Failed to fetch catalog attribute discount rules" });
  }
});

// Get attribute discount rules by attribute
router.get("/attribute-discount-rules/attribute/:attributeId", async (req, res) => {
  try {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return res.status(400).json({ error: "Invalid attribute ID" });
    }
    
    const rules = await storage.getAttributeDiscountRulesByAttribute(attributeId);
    res.json(rules);
  } catch (error) {
    console.error("Error fetching attribute discount rules by attribute:", error);
    res.status(500).json({ error: "Failed to fetch attribute discount rules by attribute" });
  }
});

// Get a single attribute discount rule by ID
router.get("/attribute-discount-rules/:id", async (req, res) => {
  try {
    const ruleId = parseInt(req.params.id);
    if (isNaN(ruleId)) {
      return res.status(400).json({ error: "Invalid rule ID" });
    }
    
    const rule = await storage.getAttributeDiscountRule(ruleId);
    if (!rule) {
      return res.status(404).json({ error: "Attribute discount rule not found" });
    }
    
    res.json(rule);
  } catch (error) {
    console.error("Error fetching attribute discount rule:", error);
    res.status(500).json({ error: "Failed to fetch attribute discount rule" });
  }
});

// Create a new attribute discount rule
router.post("/attribute-discount-rules", async (req, res) => {
  try {
    const payload = insertAttributeDiscountRuleSchema.parse(req.body);
    
    // Handle date conversion
    if (payload.startDate && typeof payload.startDate === 'string') {
      payload.startDate = new Date(payload.startDate);
    }
    
    if (payload.endDate && typeof payload.endDate === 'string') {
      payload.endDate = new Date(payload.endDate);
    }
    
    const rule = await storage.createAttributeDiscountRule(payload);
    res.status(201).json(rule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating attribute discount rule:", error);
    res.status(500).json({ error: "Failed to create attribute discount rule" });
  }
});

// Update an attribute discount rule
router.put("/attribute-discount-rules/:id", async (req, res) => {
  try {
    const ruleId = parseInt(req.params.id);
    if (isNaN(ruleId)) {
      return res.status(400).json({ error: "Invalid rule ID" });
    }
    
    const payload = insertAttributeDiscountRuleSchema.parse(req.body);
    
    // Handle date conversion
    if (payload.startDate && typeof payload.startDate === 'string') {
      payload.startDate = new Date(payload.startDate);
    }
    
    if (payload.endDate && typeof payload.endDate === 'string') {
      payload.endDate = new Date(payload.endDate);
    }
    
    const existingRule = await storage.getAttributeDiscountRule(ruleId);
    if (!existingRule) {
      return res.status(404).json({ error: "Attribute discount rule not found" });
    }
    
    const updatedRule = await storage.updateAttributeDiscountRule(ruleId, payload);
    res.json(updatedRule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error updating attribute discount rule:", error);
    res.status(500).json({ error: "Failed to update attribute discount rule" });
  }
});

// Delete an attribute discount rule
router.delete("/attribute-discount-rules/:id", async (req, res) => {
  try {
    const ruleId = parseInt(req.params.id);
    if (isNaN(ruleId)) {
      return res.status(400).json({ error: "Invalid rule ID" });
    }
    
    const existingRule = await storage.getAttributeDiscountRule(ruleId);
    if (!existingRule) {
      return res.status(404).json({ error: "Attribute discount rule not found" });
    }
    
    await storage.deleteAttributeDiscountRule(ruleId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting attribute discount rule:", error);
    res.status(500).json({ error: "Failed to delete attribute discount rule" });
  }
});

// Calculate price adjustments based on selected attributes and product
router.post("/attribute-discount-rules/calculate", async (req, res) => {
  try {
    const { productId, selectedAttributes, quantity = 1 } = req.body;
    
    if (!productId || !selectedAttributes) {
      return res.status(400).json({ error: "Product ID and selected attributes are required" });
    }
    
    const adjustments = await storage.calculateAttributeBasedPriceAdjustments(
      productId,
      selectedAttributes,
      quantity
    );
    
    res.json(adjustments);
  } catch (error) {
    console.error("Error calculating price adjustments:", error);
    res.status(500).json({ error: "Failed to calculate price adjustments" });
  }
});

export default router;