import { Express, Request, Response } from "express";
import { ZodError } from "zod";
import { storage } from "./storage";
import { isAdmin } from "./auth-middleware";
import {
  insertAttributeSchema,
  insertAttributeOptionSchema,
  insertCatalogAttributeSchema,
  insertCatalogAttributeOptionSchema,
  insertCategoryAttributeSchema,
  insertCategoryAttributeOptionSchema,
  insertProductAttributeSchema,
  insertProductAttributeOptionSchema,
  insertProductAttributeValueSchema
} from "@shared/schema";

/**
 * Register all attribute-related routes
 */
export default function registerAttributeRoutes(app: Express) {
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
      console.error("Error in attribute route:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

  // Global Attribute Routes
  app.get("/api/attributes", handleErrors(async (req: Request, res: Response) => {
    const attributes = await storage.getAttributes();
    res.json(attributes);
  }));

  app.get("/api/attributes/:id", handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const attribute = await storage.getAttributeById(id);
    if (!attribute) {
      return res.status(404).json({ message: "Attribute not found" });
    }

    res.json(attribute);
  }));

  app.post("/api/attributes", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeData = insertAttributeSchema.parse(req.body);
    const newAttribute = await storage.createAttribute(attributeData);
    res.status(201).json(newAttribute);
  }));

  app.put("/api/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const attributeData = insertAttributeSchema.partial().parse(req.body);
    const updatedAttribute = await storage.updateAttribute(id, attributeData);
    
    if (!updatedAttribute) {
      return res.status(404).json({ message: "Attribute not found" });
    }
    
    res.json(updatedAttribute);
  }));

  app.delete("/api/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const success = await storage.deleteAttribute(id);
    if (!success) {
      return res.status(404).json({ message: "Attribute not found or could not be deleted" });
    }
    
    res.status(204).send();
  }));

  // Attribute Options Routes
  app.get("/api/attributes/:attributeId/options", handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const options = await storage.getAttributeOptions(attributeId);
    res.json(options);
  }));

  app.post("/api/attributes/:attributeId/options", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const optionData = insertAttributeOptionSchema.parse({
      ...req.body,
      attributeId
    });
    
    const newOption = await storage.createAttributeOption(optionData);
    res.status(201).json(newOption);
  }));

  app.put("/api/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    const id = parseInt(req.params.id);
    
    if (isNaN(attributeId) || isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const optionData = insertAttributeOptionSchema.partial().parse(req.body);
    const updatedOption = await storage.updateAttributeOption(id, optionData);
    
    if (!updatedOption) {
      return res.status(404).json({ message: "Option not found" });
    }
    
    res.json(updatedOption);
  }));

  app.delete("/api/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid option ID" });
    }

    const success = await storage.deleteAttributeOption(id);
    if (!success) {
      return res.status(404).json({ message: "Option not found or could not be deleted" });
    }
    
    res.status(204).send();
  }));

  app.post("/api/attributes/:attributeId/options/reorder", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const { optionIds } = req.body;
    if (!Array.isArray(optionIds)) {
      return res.status(400).json({ message: "optionIds must be an array of IDs" });
    }

    const success = await storage.updateAttributeOptionsOrder(attributeId, optionIds);
    if (!success) {
      return res.status(500).json({ message: "Failed to update options order" });
    }
    
    res.status(200).json({ message: "Options reordered successfully" });
  }));

  // Catalog Attribute Routes
  app.get("/api/catalogs/:catalogId/attributes", handleErrors(async (req: Request, res: Response) => {
    const catalogId = parseInt(req.params.catalogId);
    if (isNaN(catalogId)) {
      return res.status(400).json({ message: "Invalid catalog ID" });
    }

    const attributes = await storage.getCatalogAttributes(catalogId);
    res.json(attributes);
  }));

  app.post("/api/catalogs/:catalogId/attributes", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const catalogId = parseInt(req.params.catalogId);
    if (isNaN(catalogId)) {
      return res.status(400).json({ message: "Invalid catalog ID" });
    }

    const attributeData = insertCatalogAttributeSchema.parse({
      ...req.body,
      catalogId
    });
    
    const newAttribute = await storage.createCatalogAttribute(attributeData);
    res.status(201).json(newAttribute);
  }));

  app.put("/api/catalogs/:catalogId/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const attributeData = insertCatalogAttributeSchema.partial().parse(req.body);
    const updatedAttribute = await storage.updateCatalogAttribute(id, attributeData);
    
    if (!updatedAttribute) {
      return res.status(404).json({ message: "Catalog attribute not found" });
    }
    
    res.json(updatedAttribute);
  }));

  app.delete("/api/catalogs/:catalogId/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const success = await storage.deleteCatalogAttribute(id);
    if (!success) {
      return res.status(404).json({ message: "Catalog attribute not found or could not be deleted" });
    }
    
    res.status(204).send();
  }));

  // Catalog Attribute Options Routes
  app.get("/api/catalogs/:catalogId/attributes/:attributeId/options", handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const options = await storage.getCatalogAttributeOptions(attributeId);
    res.json(options);
  }));

  app.post("/api/catalogs/:catalogId/attributes/:attributeId/options", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const optionData = insertCatalogAttributeOptionSchema.parse({
      ...req.body,
      catalogAttributeId: attributeId
    });
    
    const newOption = await storage.createCatalogAttributeOption(optionData);
    res.status(201).json(newOption);
  }));

  app.put("/api/catalogs/:catalogId/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid option ID" });
    }

    const optionData = insertCatalogAttributeOptionSchema.partial().parse(req.body);
    const updatedOption = await storage.updateCatalogAttributeOption(id, optionData);
    
    if (!updatedOption) {
      return res.status(404).json({ message: "Option not found" });
    }
    
    res.json(updatedOption);
  }));

  app.delete("/api/catalogs/:catalogId/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid option ID" });
    }

    const success = await storage.deleteCatalogAttributeOption(id);
    if (!success) {
      return res.status(404).json({ message: "Option not found or could not be deleted" });
    }
    
    res.status(204).send();
  }));

  app.post("/api/catalogs/:catalogId/attributes/:attributeId/options/reorder", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return res.status(400).json({ message: "Invalid attribute ID" });
    }

    const { optionIds } = req.body;
    if (!Array.isArray(optionIds)) {
      return res.status(400).json({ message: "optionIds must be an array of IDs" });
    }

    const success = await storage.updateCatalogAttributeOptionsOrder(attributeId, optionIds);
    if (!success) {
      return res.status(500).json({ message: "Failed to update options order" });
    }
    
    res.status(200).json({ message: "Options reordered successfully" });
  }));
}