import { Express, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { storage } from "./storage";
import { isAdmin } from "./auth-middleware";
import { logger } from "./logger";
import { sendError, sendSuccess } from "./api-response";
import { withStandardResponse } from "./response-wrapper";
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
        sendError(res, "Validation error", 400, "VALIDATION_ERROR", error.errors);
        return;
      }
      logger.error("Error in attribute route:", error);
      sendError(res, "Internal server error", 500, "INTERNAL_ERROR");
    }
  };

  // Global Attribute Routes
  app.get("/api/attributes", handleErrors(async (req: Request, res: Response) => {
    const attributes = await storage.getAllAttributes();
    sendSuccess(res, attributes);
  }));

  app.get("/api/attributes/:id", handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const attribute = await storage.getAttributeById(id);
    if (!attribute) {
      return sendError(res, "Attribute not found", 404, "NOT_FOUND");
    }

    sendSuccess(res, attribute);
  }));

  app.post("/api/attributes", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeData = insertAttributeSchema.parse(req.body);
    const newAttribute = await storage.createAttribute(attributeData);
    sendSuccess(res, newAttribute, 201);
  }));

  app.put("/api/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const attributeData = insertAttributeSchema.partial().parse(req.body);
    const updatedAttribute = await storage.updateAttribute(id, attributeData);
    
    if (!updatedAttribute) {
      return sendError(res, "Attribute not found", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, updatedAttribute);
  }));

  app.delete("/api/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const success = await storage.deleteAttribute(id);
    if (!success) {
      return sendError(res, "Attribute not found or could not be deleted", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, null, 204);
  }));

  // Attribute Options Routes
  app.get("/api/attributes/:attributeId/options", handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const options = await storage.getAttributeOptions(attributeId);
    sendSuccess(res, options);
  }));

  app.post("/api/attributes/:attributeId/options", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const optionData = insertAttributeOptionSchema.parse({
      ...req.body,
      attributeId
    });
    
    const newOption = await storage.createAttributeOption(optionData);
    sendSuccess(res, newOption, 201);
  }));

  app.put("/api/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    const id = parseInt(req.params.id);
    
    if (isNaN(attributeId) || isNaN(id)) {
      return sendError(res, "Invalid ID", 400, "INVALID_ID");
    }

    const optionData = insertAttributeOptionSchema.partial().parse(req.body);
    const updatedOption = await storage.updateAttributeOption(id, optionData);
    
    if (!updatedOption) {
      return sendError(res, "Option not found", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, updatedOption);
  }));

  app.delete("/api/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid option ID", 400, "INVALID_ID");
    }

    const success = await storage.deleteAttributeOption(id);
    if (!success) {
      return sendError(res, "Option not found or could not be deleted", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, null, 204);
  }));

  app.post("/api/attributes/:attributeId/options/reorder", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const { optionIds } = req.body;
    if (!Array.isArray(optionIds)) {
      return sendError(res, "optionIds must be an array of IDs", 400, "INVALID_FORMAT");
    }

    const success = await storage.updateAttributeOptionsOrder(attributeId, optionIds);
    if (!success) {
      return sendError(res, "Failed to update options order", 500, "SERVER_ERROR");
    }
    
    sendSuccess(res, { message: "Options reordered successfully" });
  }));

  // Catalog Attribute Routes
  app.get("/api/catalogs/:catalogId/attributes", handleErrors(async (req: Request, res: Response) => {
    const catalogId = parseInt(req.params.catalogId);
    if (isNaN(catalogId)) {
      return sendError(res, "Invalid catalog ID", 400, "INVALID_ID");
    }

    const attributes = await storage.getCatalogAttributes(catalogId);
    sendSuccess(res, attributes);
  }));

  app.post("/api/catalogs/:catalogId/attributes", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const catalogId = parseInt(req.params.catalogId);
    if (isNaN(catalogId)) {
      return sendError(res, "Invalid catalog ID", 400, "INVALID_ID");
    }

    const attributeData = insertCatalogAttributeSchema.parse({
      ...req.body,
      catalogId
    });
    
    const newAttribute = await storage.createCatalogAttribute(attributeData);
    sendSuccess(res, newAttribute, 201);
  }));

  app.put("/api/catalogs/:catalogId/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const attributeData = insertCatalogAttributeSchema.partial().parse(req.body);
    const updatedAttribute = await storage.updateCatalogAttribute(id, attributeData);
    
    if (!updatedAttribute) {
      return sendError(res, "Catalog attribute not found", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, updatedAttribute);
  }));

  app.delete("/api/catalogs/:catalogId/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const success = await storage.deleteCatalogAttribute(id);
    if (!success) {
      return sendError(res, "Catalog attribute not found or could not be deleted", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, null, 204);
  }));

  // Catalog Attribute Options Routes
  app.get("/api/catalogs/:catalogId/attributes/:attributeId/options", handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const options = await storage.getCatalogAttributeOptions(attributeId);
    sendSuccess(res, options);
  }));

  app.post("/api/catalogs/:catalogId/attributes/:attributeId/options", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const optionData = insertCatalogAttributeOptionSchema.parse({
      ...req.body,
      catalogAttributeId: attributeId
    });
    
    const newOption = await storage.createCatalogAttributeOption(optionData);
    sendSuccess(res, newOption, 201);
  }));

  app.put("/api/catalogs/:catalogId/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid option ID", 400, "INVALID_ID");
    }

    const optionData = insertCatalogAttributeOptionSchema.partial().parse(req.body);
    const updatedOption = await storage.updateCatalogAttributeOption(id, optionData);
    
    if (!updatedOption) {
      return sendError(res, "Option not found", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, updatedOption);
  }));

  app.delete("/api/catalogs/:catalogId/attributes/:attributeId/options/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid option ID", 400, "INVALID_ID");
    }

    const success = await storage.deleteCatalogAttributeOption(id);
    if (!success) {
      return sendError(res, "Option not found or could not be deleted", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, null, 204);
  }));

  app.post("/api/catalogs/:catalogId/attributes/:attributeId/options/reorder", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const { optionIds } = req.body;
    if (!Array.isArray(optionIds)) {
      return sendError(res, "optionIds must be an array of IDs", 400, "INVALID_FORMAT");
    }

    const success = await storage.updateCatalogAttributeOptionsOrder(attributeId, optionIds);
    if (!success) {
      return sendError(res, "Failed to update options order", 500, "SERVER_ERROR");
    }
    
    sendSuccess(res, { message: "Options reordered successfully" });
  }));
}