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
router.get("/attribute-discount-rules", 
  handleErrors(async (req: Request, res: Response) => {
    try {
      const rules = await storage.getAllAttributeDiscountRules();
      
      logger.debug(`Retrieved ${rules.length} attribute discount rules`);
      
      sendSuccess(res, rules);
    } catch (error) {
      logger.error('Error fetching all attribute discount rules:', { 
        error,
        userId: req.user?.id
      });
      throw error;
    }
  })
);

// Get attribute discount rules by product
router.get("/attribute-discount-rules/product/:productId", 
  validateRequest({
    params: z.object({
      productId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Product ID must be a number" })
    })
  }),
  handleErrors(async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      
      // Verify that the product exists
      const product = await storage.getProductById(productId);
      if (!product) {
        throw new NotFoundError(`Product with ID ${productId} not found`, 'product');
      }
      
      const rules = await storage.getAttributeDiscountRulesByProduct(productId);
      
      logger.debug(`Retrieved ${rules.length} attribute discount rules for product ID ${productId}`);
      
      sendSuccess(res, rules);
    } catch (error) {
      logger.error('Error fetching attribute discount rules by product:', { 
        error, 
        productId: req.params.productId,
        userId: req.user?.id
      });
      throw error;
    }
  })
);

// Get attribute discount rules by category
router.get("/attribute-discount-rules/category/:categoryId", 
  validateRequest({
    params: z.object({
      categoryId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Category ID must be a number" })
    })
  }),
  handleErrors(async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      
      // Verify that the category exists
      const category = await storage.getCategoryById(categoryId);
      if (!category) {
        throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
      }
      
      const rules = await storage.getAttributeDiscountRulesByCategory(categoryId);
      
      logger.debug(`Retrieved ${rules.length} attribute discount rules for category ID ${categoryId}`);
      
      sendSuccess(res, rules);
    } catch (error) {
      logger.error('Error fetching attribute discount rules by category:', { 
        error, 
        categoryId: req.params.categoryId,
        userId: req.user?.id
      });
      throw error;
    }
  })
);

// Get attribute discount rules by catalog
router.get("/attribute-discount-rules/catalog/:catalogId", 
  validateRequest({
    params: z.object({
      catalogId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Catalog ID must be a number" })
    })
  }),
  handleErrors(async (req: Request, res: Response) => {
    try {
      const catalogId = parseInt(req.params.catalogId);
      
      // Verify that the catalog exists
      const catalog = await storage.getCatalogById(catalogId);
      if (!catalog) {
        throw new NotFoundError(`Catalog with ID ${catalogId} not found`, 'catalog');
      }
      
      const rules = await storage.getAttributeDiscountRulesByCatalog(catalogId);
      
      logger.debug(`Retrieved ${rules.length} attribute discount rules for catalog ID ${catalogId}`);
      
      sendSuccess(res, rules);
    } catch (error) {
      logger.error('Error fetching attribute discount rules by catalog:', { 
        error, 
        catalogId: req.params.catalogId,
        userId: req.user?.id
      });
      throw error;
    }
  })
);

// Get attribute discount rules by attribute
router.get("/attribute-discount-rules/attribute/:attributeId", 
  validateRequest({
    params: z.object({
      attributeId: z.string().refine(val => !isNaN(parseInt(val)), { message: "Attribute ID must be a number" })
    })
  }),
  handleErrors(async (req: Request, res: Response) => {
    try {
      const attributeId = parseInt(req.params.attributeId);
      
      // Verify that the attribute exists
      const attribute = await storage.getAttributeById(attributeId);
      if (!attribute) {
        throw new NotFoundError(`Attribute with ID ${attributeId} not found`, 'attribute');
      }
      
      const rules = await storage.getAttributeDiscountRulesByAttribute(attributeId);
      
      logger.debug(`Retrieved ${rules.length} attribute discount rules for attribute ID ${attributeId}`);
      
      sendSuccess(res, rules);
    } catch (error) {
      logger.error('Error fetching attribute discount rules by attribute:', { 
        error, 
        attributeId: req.params.attributeId,
        userId: req.user?.id
      });
      throw error;
    }
  })
);

// Get a single attribute discount rule by ID
router.get("/attribute-discount-rules/:id", 
  validateRequest({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Rule ID must be a number" })
    })
  }),
  handleErrors(async (req: Request, res: Response) => {
    try {
      const ruleId = parseInt(req.params.id);
      
      const rule = await storage.getAttributeDiscountRule(ruleId);
      if (!rule) {
        throw new NotFoundError(`Attribute discount rule with ID ${ruleId} not found`, 'attribute_discount_rule');
      }
      
      logger.debug(`Retrieved attribute discount rule ID ${ruleId}`);
      
      sendSuccess(res, rule);
    } catch (error) {
      logger.error('Error fetching attribute discount rule by ID:', { 
        error, 
        ruleId: req.params.id,
        userId: req.user?.id
      });
      throw error;
    }
  })
);

// Create a new attribute discount rule
router.post("/attribute-discount-rules", 
  isAdmin,
  validateRequest({
    body: insertAttributeDiscountRuleSchema
  }),
  handleErrors(async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      
      // Handle date conversion
      if (payload.startDate && typeof payload.startDate === 'string') {
        payload.startDate = new Date(payload.startDate);
      }
      
      if (payload.endDate && typeof payload.endDate === 'string') {
        payload.endDate = new Date(payload.endDate);
      }
      
      // Validate dates
      if (payload.startDate && payload.endDate && payload.startDate > payload.endDate) {
        throw new ValidationError("Start date cannot be after end date", "startDate");
      }
      
      // Validate discount range
      if (payload.discountType === 'percentage' && (payload.discountValue < 0 || payload.discountValue > 100)) {
        throw new ValidationError("Percentage discount must be between 0 and 100", "discountValue");
      }
      
      if (payload.discountType === 'fixed' && payload.discountValue < 0) {
        throw new ValidationError("Fixed discount cannot be negative", "discountValue");
      }
      
      // Check if required entities exist
      if (payload.productId) {
        const product = await storage.getProductById(payload.productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${payload.productId} not found`, 'product');
        }
      }
      
      if (payload.categoryId) {
        const category = await storage.getCategoryById(payload.categoryId);
        if (!category) {
          throw new NotFoundError(`Category with ID ${payload.categoryId} not found`, 'category');
        }
      }
      
      if (payload.catalogId) {
        const catalog = await storage.getCatalogById(payload.catalogId);
        if (!catalog) {
          throw new NotFoundError(`Catalog with ID ${payload.catalogId} not found`, 'catalog');
        }
      }
      
      if (payload.attributeId) {
        const attribute = await storage.getAttributeById(payload.attributeId);
        if (!attribute) {
          throw new NotFoundError(`Attribute with ID ${payload.attributeId} not found`, 'attribute');
        }
      }
      
      const rule = await storage.createAttributeDiscountRule(payload);
      
      logger.info(`Attribute discount rule created`, {
        ruleId: rule.id,
        discountType: rule.discountType,
        discountValue: rule.discountValue,
        userId: req.user?.id
      });
      
      sendSuccess(res, rule, 201);
    } catch (error) {
      logger.error('Error creating attribute discount rule:', { 
        error, 
        payload: req.body,
        userId: req.user?.id
      });
      throw error;
    }
  })
);

// Update an attribute discount rule
router.put("/attribute-discount-rules/:id", 
  isAdmin,
  validateRequest({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val)), { message: "Rule ID must be a number" })
    }),
    body: insertAttributeDiscountRuleSchema
  }),
  handleErrors(async (req: Request, res: Response) => {
    try {
      const ruleId = parseInt(req.params.id);
      const payload = req.body;
      
      // Handle date conversion
      if (payload.startDate && typeof payload.startDate === 'string') {
        payload.startDate = new Date(payload.startDate);
      }
      
      if (payload.endDate && typeof payload.endDate === 'string') {
        payload.endDate = new Date(payload.endDate);
      }
      
      // Validate dates
      if (payload.startDate && payload.endDate && payload.startDate > payload.endDate) {
        throw new ValidationError("Start date cannot be after end date", "startDate");
      }
      
      // Validate discount range
      if (payload.discountType === 'percentage' && (payload.discountValue < 0 || payload.discountValue > 100)) {
        throw new ValidationError("Percentage discount must be between 0 and 100", "discountValue");
      }
      
      if (payload.discountType === 'fixed' && payload.discountValue < 0) {
        throw new ValidationError("Fixed discount cannot be negative", "discountValue");
      }
      
      // Check if rule exists
      const existingRule = await storage.getAttributeDiscountRule(ruleId);
      if (!existingRule) {
        throw new NotFoundError(`Attribute discount rule with ID ${ruleId} not found`, 'attribute_discount_rule');
      }
      
      // Check if required entities exist
      if (payload.productId) {
        const product = await storage.getProductById(payload.productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${payload.productId} not found`, 'product');
        }
      }
      
      if (payload.categoryId) {
        const category = await storage.getCategoryById(payload.categoryId);
        if (!category) {
          throw new NotFoundError(`Category with ID ${payload.categoryId} not found`, 'category');
        }
      }
      
      if (payload.catalogId) {
        const catalog = await storage.getCatalogById(payload.catalogId);
        if (!catalog) {
          throw new NotFoundError(`Catalog with ID ${payload.catalogId} not found`, 'catalog');
        }
      }
      
      if (payload.attributeId) {
        const attribute = await storage.getAttributeById(payload.attributeId);
        if (!attribute) {
          throw new NotFoundError(`Attribute with ID ${payload.attributeId} not found`, 'attribute');
        }
      }
      
      const updatedRule = await storage.updateAttributeDiscountRule(ruleId, payload);
      if (!updatedRule) {
        throw new AppError(
          `Failed to update attribute discount rule with ID ${ruleId}`,
          ErrorCode.OPERATION_FAILED,
          500
        );
      }
      
      logger.info(`Attribute discount rule updated`, {
        ruleId,
        discountType: updatedRule.discountType,
        discountValue: updatedRule.discountValue,
        userId: req.user?.id
      });
      
      sendSuccess(res, updatedRule);
    } catch (error) {
      logger.error('Error updating attribute discount rule:', { 
        error, 
        ruleId: req.params.id,
        payload: req.body,
        userId: req.user?.id
      });
      throw error;
    }
  })
);

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
router.post("/attribute-discount-rules/calculate", 
  validateRequest({
    body: z.object({
      productId: z.number({
        required_error: "Product ID is required",
        invalid_type_error: "Product ID must be a number"
      }),
      selectedAttributes: z.record(z.array(z.number())).refine(val => Object.keys(val).length > 0, {
        message: "Selected attributes are required",
        path: ["selectedAttributes"]
      }),
      quantity: z.number().positive().default(1)
    })
  }),
  handleErrors(async (req: Request, res: Response) => {
    try {
      const { productId, selectedAttributes, quantity = 1 } = req.body;
      
      // Verify that the product exists
      const product = await storage.getProductById(productId);
      if (!product) {
        throw new NotFoundError(`Product with ID ${productId} not found`, 'product');
      }
      
      // Verify that all attribute IDs in selectedAttributes exist
      const attributeIds = Object.keys(selectedAttributes);
      for (const attributeId of attributeIds) {
        const attribute = await storage.getAttributeById(parseInt(attributeId));
        if (!attribute) {
          throw new NotFoundError(`Attribute with ID ${attributeId} not found`, 'attribute');
        }
        
        // Verify that all option IDs exist for this attribute
        const optionIds = selectedAttributes[attributeId];
        
        // For now, we trust that the options are valid
        // This would be enhanced when the proper attribute relation methods are implemented
        // in the storage class
        
        if (optionIds.length === 0) {
          throw new ValidationError(`No options selected for attribute ID ${attributeId}`, `selectedAttributes.${attributeId}`);
        }
        
        logger.debug(`Attribute ${attributeId} has ${optionIds.length} selected options`);
      }
      
      // Calculate adjustments
      const adjustments = await storage.calculateAttributeBasedPriceAdjustments(
        productId,
        selectedAttributes,
        quantity
      );
      
      logger.debug(`Calculated price adjustments for product`, {
        productId,
        selectedAttributeCount: Object.keys(selectedAttributes).length,
        adjustments
      });
      
      sendSuccess(res, adjustments);
    } catch (error) {
      logger.error('Error calculating attribute-based price adjustments:', { 
        error, 
        productId: req.body?.productId,
        selectedAttributes: req.body?.selectedAttributes,
        quantity: req.body?.quantity,
        userId: req.user?.id
      });
      throw error;
    }
  })
);

export default router;