import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { attributeDiscountRules, insertAttributeDiscountRuleSchema } from "@shared/schema";
import { z } from "zod";
import { sendSuccess, sendError } from "./api-response";

const router = Router();

// Helper function to standardize error handling
const handleErrors = (fn: Function) => async (req: Request, res: Response) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, "Validation error", 400, "VALIDATION_ERROR", error.errors);
    }
    console.error("API Error:", error);
    sendError(res, error.message || "An unexpected error occurred", 500, "SERVER_ERROR");
  }
};

// Get all attribute discount rules
router.get("/attribute-discount-rules", handleErrors(async (req: Request, res: Response) => {
  const rules = await storage.getAllAttributeDiscountRules();
  sendSuccess(res, rules);
}));

// Get attribute discount rules by product
router.get("/attribute-discount-rules/product/:productId", handleErrors(async (req: Request, res: Response) => {
  const productId = parseInt(req.params.productId);
  if (isNaN(productId)) {
    return sendError(res, "Invalid product ID", 400, "INVALID_ID");
  }
  
  const rules = await storage.getAttributeDiscountRulesByProduct(productId);
  sendSuccess(res, rules);
}));

// Get attribute discount rules by category
router.get("/attribute-discount-rules/category/:categoryId", handleErrors(async (req: Request, res: Response) => {
  const categoryId = parseInt(req.params.categoryId);
  if (isNaN(categoryId)) {
    return sendError(res, "Invalid category ID", 400, "INVALID_ID");
  }
  
  const rules = await storage.getAttributeDiscountRulesByCategory(categoryId);
  sendSuccess(res, rules);
}));

// Get attribute discount rules by catalog
router.get("/attribute-discount-rules/catalog/:catalogId", handleErrors(async (req: Request, res: Response) => {
  const catalogId = parseInt(req.params.catalogId);
  if (isNaN(catalogId)) {
    return sendError(res, "Invalid catalog ID", 400, "INVALID_ID");
  }
  
  const rules = await storage.getAttributeDiscountRulesByCatalog(catalogId);
  sendSuccess(res, rules);
}));

// Get attribute discount rules by attribute
router.get("/attribute-discount-rules/attribute/:attributeId", handleErrors(async (req: Request, res: Response) => {
  const attributeId = parseInt(req.params.attributeId);
  if (isNaN(attributeId)) {
    return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
  }
  
  const rules = await storage.getAttributeDiscountRulesByAttribute(attributeId);
  sendSuccess(res, rules);
}));

// Get a single attribute discount rule by ID
router.get("/attribute-discount-rules/:id", handleErrors(async (req: Request, res: Response) => {
  const ruleId = parseInt(req.params.id);
  if (isNaN(ruleId)) {
    return sendError(res, "Invalid rule ID", 400, "INVALID_ID");
  }
  
  const rule = await storage.getAttributeDiscountRule(ruleId);
  if (!rule) {
    return sendError(res, "Attribute discount rule not found", 404, "NOT_FOUND");
  }
  
  sendSuccess(res, rule);
}));

// Create a new attribute discount rule
router.post("/attribute-discount-rules", handleErrors(async (req: Request, res: Response) => {
  const payload = insertAttributeDiscountRuleSchema.parse(req.body);
  
  // Handle date conversion
  if (payload.startDate && typeof payload.startDate === 'string') {
    payload.startDate = new Date(payload.startDate);
  }
  
  if (payload.endDate && typeof payload.endDate === 'string') {
    payload.endDate = new Date(payload.endDate);
  }
  
  const rule = await storage.createAttributeDiscountRule(payload);
  sendSuccess(res, rule, 201);
}));

// Update an attribute discount rule
router.put("/attribute-discount-rules/:id", handleErrors(async (req: Request, res: Response) => {
  const ruleId = parseInt(req.params.id);
  if (isNaN(ruleId)) {
    return sendError(res, "Invalid rule ID", 400, "INVALID_ID");
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
    return sendError(res, "Attribute discount rule not found", 404, "NOT_FOUND");
  }
  
  const updatedRule = await storage.updateAttributeDiscountRule(ruleId, payload);
  sendSuccess(res, updatedRule);
}));

// Delete an attribute discount rule
router.delete("/attribute-discount-rules/:id", handleErrors(async (req: Request, res: Response) => {
  const ruleId = parseInt(req.params.id);
  if (isNaN(ruleId)) {
    return sendError(res, "Invalid rule ID", 400, "INVALID_ID");
  }
  
  const existingRule = await storage.getAttributeDiscountRule(ruleId);
  if (!existingRule) {
    return sendError(res, "Attribute discount rule not found", 404, "NOT_FOUND");
  }
  
  await storage.deleteAttributeDiscountRule(ruleId);
  res.status(204).send();
}));

// Calculate price adjustments based on selected attributes and product
router.post("/attribute-discount-rules/calculate", handleErrors(async (req: Request, res: Response) => {
  const { productId, selectedAttributes, quantity = 1 } = req.body;
  
  if (!productId || !selectedAttributes) {
    return sendError(res, "Product ID and selected attributes are required", 400, "MISSING_REQUIRED_FIELDS");
  }
  
  const adjustments = await storage.calculateAttributeBasedPriceAdjustments(
    productId,
    selectedAttributes,
    quantity
  );
  
  sendSuccess(res, adjustments);
}));

export default router;