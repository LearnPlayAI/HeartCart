import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { z } from "zod";
import { sendSuccess, sendError } from "./api-response";
import { isAuthenticated } from "./routes";
import { NotFoundError, ForbiddenError } from "./custom-errors";

const router = Router();

// Helper function to standardize error handling
const handleErrors = (fn: Function) => async (req: Request, res: Response) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, "Validation error", 400, "VALIDATION_ERROR", error.errors);
    }
    if (error instanceof NotFoundError) {
      return sendError(res, error.message, 404, "NOT_FOUND", { entity: error.entity });
    }
    if (error instanceof ForbiddenError) {
      return sendError(res, error.message, 403, "FORBIDDEN");
    }
    console.error("API Error:", error);
    sendError(res, error.message || "An unexpected error occurred", 500, "SERVER_ERROR");
  }
};

// Middleware to check if user is admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  const user = req.user as any;
  if (!user || user.role !== 'admin') {
    return sendError(res, "Only administrators can access this resource", 403, "FORBIDDEN");
  }
  next();
};

// Get all pricing settings
router.get("/admin/pricing", isAuthenticated, isAdmin, handleErrors(async (req: Request, res: Response) => {
  const pricingSettings = await storage.getAllPricingSettings();
  sendSuccess(res, pricingSettings);
}));

// Get default markup percentage
router.get("/pricing/default-markup", handleErrors(async (req: Request, res: Response) => {
  const defaultMarkup = await storage.getDefaultMarkupPercentage();
  sendSuccess(res, { markupPercentage: defaultMarkup, isSet: defaultMarkup !== null });
}));

// Get pricing for a specific category
router.get("/pricing/category/:categoryId", handleErrors(async (req: Request, res: Response) => {
  const categoryId = parseInt(req.params.categoryId);
  if (isNaN(categoryId)) {
    return sendError(res, "Invalid category ID", 400, "INVALID_ID");
  }
  
  // Validate that the category exists
  const category = await storage.getCategoryById(categoryId);
  if (!category) {
    return sendError(res, "Category not found", 404, "NOT_FOUND", { entity: "category" });
  }
  
  const pricing = await storage.getPricingByCategoryId(categoryId);
  
  if (!pricing) {
    const defaultMarkup = await storage.getDefaultMarkupPercentage();
    sendSuccess(res, { 
      categoryId,
      markupPercentage: defaultMarkup,
      description: defaultMarkup === null 
        ? "No pricing rule set for this category or globally" 
        : "Default pricing (category-specific pricing not set)"
    });
    return;
  }
  
  sendSuccess(res, pricing);
}));

// Create or update pricing for a category
router.post("/admin/pricing", isAuthenticated, isAdmin, handleErrors(async (req: Request, res: Response) => {
  const schema = z.object({
    categoryId: z.coerce.number().positive("Category ID is required"),
    markupPercentage: z.coerce.number().min(0, "Markup percentage must be a non-negative number"),
    description: z.string().optional()
  });
  
  const data = schema.parse(req.body);
  
  // Check if the category exists
  if (data.categoryId !== 0) { // 0 is allowed for default/global pricing
    const category = await storage.getCategoryById(data.categoryId);
    if (!category) {
      return sendError(res, "Category not found", 404, "NOT_FOUND", { entity: "category" });
    }
  }
  
  const result = await storage.createOrUpdatePricing(data);
  sendSuccess(res, result, 201);
}));

// Delete pricing setting
router.delete("/admin/pricing/:id", isAuthenticated, isAdmin, handleErrors(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return sendError(res, "Invalid pricing ID", 400, "INVALID_ID");
  }
  
  // Check if the pricing setting exists
  const pricing = await storage.getPricingById(id);
  if (!pricing) {
    return sendError(res, "Pricing setting not found", 404, "NOT_FOUND", { entity: "pricing" });
  }
  
  await storage.deletePricing(id);
  res.status(204).send();
}));

// Get pricing setting by ID
router.get("/admin/pricing/:id", isAuthenticated, isAdmin, handleErrors(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return sendError(res, "Invalid pricing ID", 400, "INVALID_ID");
  }
  
  const pricing = await storage.getPricingById(id);
  if (!pricing) {
    return sendError(res, "Pricing setting not found", 404, "NOT_FOUND", { entity: "pricing" });
  }
  
  sendSuccess(res, pricing);
}));

export default router;