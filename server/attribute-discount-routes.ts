import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { attributeDiscountRules, insertAttributeDiscountRuleSchema } from "@shared/schema";
import { z } from "zod";
import { sendSuccess, sendError } from "./api-response";
import { logger } from "./logger";
import { 
  AppError, 
  ErrorCode, 
  NotFoundError,
  ValidationError,
  BadRequestError,
  asyncHandler,
  formatZodError
} from "./error-handler";
import { validateRequest } from "./validation-middleware";
import { isAdmin } from "./auth-middleware";

const router = Router();

// Use asyncHandler instead of custom handleErrors function
const handleErrors = (fn: Function) => asyncHandler(async (req: Request, res: Response) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError("Validation error", formatZodError(error));
    }
    
    // Log error with context information
    logger.error("Error in attribute discount route:", {
      error,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    });
    
    // Rethrow error for the global error handler
    throw error;
  }
});

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
router.delete("/attribute-discount-rules/:id", 
  isAdmin,
  validateRequest({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Rule ID must be a number" })
    })
  }),
  handleErrors(async (req: Request, res: Response) => {
    try {
      const ruleId = parseInt(req.params.id);
      
      // Check if rule exists
      const existingRule = await storage.getAttributeDiscountRule(ruleId);
      if (!existingRule) {
        throw new NotFoundError(`Attribute discount rule with ID ${ruleId} not found`, 'attribute_discount_rule');
      }
      
      // Check if the rule is currently in use (e.g., any active discounts referencing it)
      // This would depend on your specific data model relationships
      
      // Delete the rule
      const success = await storage.deleteAttributeDiscountRule(ruleId);
      if (!success) {
        throw new AppError(
          `Failed to delete attribute discount rule with ID ${ruleId}`,
          ErrorCode.OPERATION_FAILED,
          500
        );
      }
      
      logger.info(`Attribute discount rule deleted`, {
        ruleId,
        userId: req.user?.id
      });
      
      sendSuccess(res, null, 204);
    } catch (error) {
      logger.error('Error deleting attribute discount rule:', { 
        error, 
        ruleId: req.params.id,
        userId: req.user?.id
      });
      throw error;
    }
  })
);

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