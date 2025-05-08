import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { z } from "zod";
import { withStandardResponse } from "./response-wrapper";
import { isAuthenticated, isAdmin } from "./auth-middleware";

const router = Router();

// We're using isAdmin middleware imported from auth-middleware.ts

// Get all pricing settings
router.get("/admin/pricing", isAuthenticated, isAdmin, withStandardResponse(async (req: Request) => {
  return await storage.getAllPricingSettings();
}));

// Get default markup percentage
router.get("/pricing/default-markup", withStandardResponse(async () => {
  const defaultMarkup = await storage.getDefaultMarkupPercentage();
  return { markupPercentage: defaultMarkup, isSet: defaultMarkup !== null };
}));

// Get pricing for a specific category
router.get("/pricing/category/:categoryId", withStandardResponse(async (req: Request) => {
  const categoryId = parseInt(req.params.categoryId);
  if (isNaN(categoryId)) {
    throw new Error("Invalid category ID");
  }
  
  // Validate that the category exists
  const category = await storage.getCategoryById(categoryId);
  if (!category) {
    throw new Error("Category not found");
  }
  
  const pricing = await storage.getPricingByCategoryId(categoryId);
  
  if (!pricing) {
    const defaultMarkup = await storage.getDefaultMarkupPercentage();
    return { 
      categoryId,
      markupPercentage: defaultMarkup,
      description: defaultMarkup === null 
        ? "No pricing rule set for this category or globally" 
        : "Default pricing (category-specific pricing not set)"
    };
  }
  
  return pricing;
}));

// Create or update pricing for a category
router.post("/admin/pricing", isAuthenticated, isAdmin, withStandardResponse(async (req: Request) => {
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
      throw new Error("Category not found");
    }
  }
  
  return await storage.createOrUpdatePricing(data);
}));

// Delete pricing setting
router.delete("/admin/pricing/:id", isAuthenticated, isAdmin, withStandardResponse(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw new Error("Invalid pricing ID");
  }
  
  // Check if the pricing setting exists
  const pricing = await storage.getPricingById(id);
  if (!pricing) {
    throw new Error("Pricing setting not found");
  }
  
  await storage.deletePricing(id);
  res.status(204).send();
  return null; // Return null since we already sent a response
}));

// Get pricing setting by ID
router.get("/admin/pricing/:id", isAuthenticated, isAdmin, withStandardResponse(async (req: Request) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw new Error("Invalid pricing ID");
  }
  
  const pricing = await storage.getPricingById(id);
  if (!pricing) {
    throw new Error("Pricing setting not found");
  }
  
  return pricing;
}));

export default router;