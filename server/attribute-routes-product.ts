import { Express, Request, Response } from "express";
import { ZodError } from "zod";
import { storage } from "./storage";
import { isAdmin } from "./auth-middleware";
import {
  insertCategoryAttributeSchema,
  insertCategoryAttributeOptionSchema,
  insertProductAttributeSchema,
  insertProductAttributeOptionSchema,
  insertProductAttributeValueSchema
} from "@shared/schema";

/**
 * Register all category and product attribute-related routes
 */
export default function registerProductAttributeRoutes(app: Express) {
  const handleErrors = (fn: Function) => async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
        return;
      }
      console.error("Error in product attribute route:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

  // Category Attribute Routes
  app.get("/api/categories/:categoryId/attributes", handleErrors(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const attributes = await storage.getCategoryAttributes(categoryId);
    res.json(attributes);
  }));

  app.post("/api/categories/:categoryId/attributes", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const attributeData = insertCategoryAttributeSchema.parse({
      ...req.body,
      categoryId
    });
    
    const newAttribute = await storage.createCategoryAttribute(attributeData);
    res.status(201).json(newAttribute);
  }));

  app.put("/api/categories/:categoryId/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const attributeData = insertCategoryAttributeSchema.partial().parse(req.body);
    const updatedAttribute = await storage.updateCategoryAttribute(id, attributeData);
    
    if (!updatedAttribute) {
      return res.status(404).json({ message: "Category attribute not found" });
    }
    
    res.json(updatedAttribute);
  }));

  app.delete("/api/categories/:categoryId/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const success = await storage.deleteCategoryAttribute(id);
    if (!success) {
      return res.status(404).json({ message: "Category attribute not found or could not be deleted" });
    }
    
    res.status(204).send();
  }));

  // Category Attribute Options Routes
  app.get("/api/categories/:categoryId/attributes/:attributeId/options", handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const options = await storage.getCategoryAttributeOptions(attributeId);
    res.json(options);
  }));

  app.post("/api/categories/:categoryId/attributes/:attributeId/options", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const optionData = insertCategoryAttributeOptionSchema.parse({
      ...req.body,
      categoryAttributeId: attributeId
    });
    
    const newOption = await storage.createCategoryAttributeOption(optionData);
    res.status(201).json(newOption);
  }));

  app.put("/api/categories/:categoryId/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid option ID" });
    }

    const optionData = insertCategoryAttributeOptionSchema.partial().parse(req.body);
    const updatedOption = await storage.updateCategoryAttributeOption(id, optionData);
    
    if (!updatedOption) {
      return res.status(404).json({ message: "Option not found" });
    }
    
    res.json(updatedOption);
  }));

  app.delete("/api/categories/:categoryId/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid option ID" });
    }

    const success = await storage.deleteCategoryAttributeOption(id);
    if (!success) {
      return res.status(404).json({ message: "Option not found or could not be deleted" });
    }
    
    res.status(204).send();
  }));

  app.post("/api/categories/:categoryId/attributes/:attributeId/options/reorder", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const { optionIds } = req.body;
    if (!Array.isArray(optionIds)) {
      return res.status(400).json({ message: "optionIds must be an array of IDs" });
    }

    const success = await storage.updateCategoryAttributeOptionsOrder(attributeId, optionIds);
    if (!success) {
      return res.status(500).json({ message: "Failed to update options order" });
    }
    
    res.status(200).json({ message: "Options reordered successfully" });
  }));

  // Product Attribute Routes
  app.get("/api/products/:productId/attributes", handleErrors(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const attributes = await storage.getProductAttributes(productId);
    res.json(attributes);
  }));

  app.post("/api/products/:productId/attributes", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const attributeData = insertProductAttributeSchema.parse({
      ...req.body,
      productId
    });
    
    const newAttribute = await storage.createProductAttribute(attributeData);
    res.status(201).json(newAttribute);
  }));

  app.put("/api/products/:productId/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const attributeData = insertProductAttributeSchema.partial().parse(req.body);
    const updatedAttribute = await storage.updateProductAttribute(id, attributeData);
    
    if (!updatedAttribute) {
      return res.status(404).json({ message: "Product attribute not found" });
    }
    
    res.json(updatedAttribute);
  }));

  app.delete("/api/products/:productId/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const success = await storage.deleteProductAttribute(id);
    if (!success) {
      return res.status(404).json({ message: "Product attribute not found or could not be deleted" });
    }
    
    res.status(204).send();
  }));

  // Product Attribute Options Routes
  app.get("/api/products/:productId/attributes/:attributeId/options", handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const options = await storage.getProductAttributeOptions(attributeId);
    res.json(options);
  }));

  app.post("/api/products/:productId/attributes/:attributeId/options", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const optionData = insertProductAttributeOptionSchema.parse({
      ...req.body,
      productAttributeId: attributeId
    });
    
    const newOption = await storage.createProductAttributeOption(optionData);
    res.status(201).json(newOption);
  }));

  app.put("/api/products/:productId/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid option ID" });
    }

    const optionData = insertProductAttributeOptionSchema.partial().parse(req.body);
    const updatedOption = await storage.updateProductAttributeOption(id, optionData);
    
    if (!updatedOption) {
      return res.status(404).json({ message: "Option not found" });
    }
    
    res.json(updatedOption);
  }));

  app.delete("/api/products/:productId/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid option ID" });
    }

    const success = await storage.deleteProductAttributeOption(id);
    if (!success) {
      return res.status(404).json({ message: "Option not found or could not be deleted" });
    }
    
    res.status(204).send();
  }));

  app.post("/api/products/:productId/attributes/:attributeId/options/reorder", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const { optionIds } = req.body;
    if (!Array.isArray(optionIds)) {
      return res.status(400).json({ message: "optionIds must be an array of IDs" });
    }

    const success = await storage.updateProductAttributeOptionsOrder(attributeId, optionIds);
    if (!success) {
      return res.status(500).json({ message: "Failed to update options order" });
    }
    
    res.status(200).json({ message: "Options reordered successfully" });
  }));

  // Product Attribute Values Routes
  app.get("/api/products/:productId/attribute-values", handleErrors(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const values = await storage.getProductAttributeValues(productId);
    res.json(values);
  }));

  app.post("/api/products/:productId/attribute-values", handleErrors(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const valueData = insertProductAttributeValueSchema.parse({
      ...req.body,
      productId
    });
    
    const newValue = await storage.createProductAttributeValue(valueData);
    res.status(201).json(newValue);
  }));

  app.put("/api/products/:productId/attribute-values/:id", handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid value ID" });
    }

    const valueData = insertProductAttributeValueSchema.partial().parse(req.body);
    const updatedValue = await storage.updateProductAttributeValue(id, valueData);
    
    if (!updatedValue) {
      return res.status(404).json({ message: "Attribute value not found" });
    }
    
    res.json(updatedValue);
  }));

  app.delete("/api/products/:productId/attribute-values/:id", handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid value ID" });
    }

    const success = await storage.deleteProductAttributeValue(id);
    if (!success) {
      return res.status(404).json({ message: "Attribute value not found or could not be deleted" });
    }
    
    res.status(204).send();
  }));
}