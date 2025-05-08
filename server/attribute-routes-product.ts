import { Express, Request, Response } from "express";
import { ZodError } from "zod";
import { storage } from "./storage";
import { isAdmin } from "./auth-middleware";
import { sendSuccess, sendError } from "./api-response";
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
        return sendError(res, "Validation error", 400, "VALIDATION_ERROR", error.errors);
      }
      console.error("Error in product attribute route:", error);
      return sendError(res, "Internal server error", 500, "SERVER_ERROR");
    }
  };

  // New endpoint to get filterable attributes for product listings
  app.get("/api/categories/:categoryId/filterable-attributes", handleErrors(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      return sendError(res, "Invalid category ID", 400, "INVALID_ID");
    }
    
    // Get all attributes for this category
    const categoryAttributes = await storage.getCategoryAttributes(categoryId);
    
    // Filter to only include filterable attributes
    const filterableAttributes = [];
    
    for (const catAttr of categoryAttributes) {
      const attribute = await storage.getAttributeById(catAttr.attributeId);
      if (attribute && attribute.isFilterable) {
        // Get the options for this attribute
        const options = await storage.getCategoryAttributeOptions(catAttr.id);
        
        // Only include attributes that have options
        if (options.length > 0) {
          filterableAttributes.push({
            ...catAttr,
            attribute,
            options
          });
        }
      }
    }
    
    sendSuccess(res, filterableAttributes);
  }));

  // Category Attribute Routes
  app.get("/api/categories/:categoryId/attributes", handleErrors(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      return sendError(res, "Invalid category ID", 400, "INVALID_ID");
    }

    const attributes = await storage.getCategoryAttributes(categoryId);
    sendSuccess(res, attributes);
  }));

  app.post("/api/categories/:categoryId/attributes", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      return sendError(res, "Invalid category ID", 400, "INVALID_ID");
    }

    const attributeData = insertCategoryAttributeSchema.parse({
      ...req.body,
      categoryId
    });
    
    const newAttribute = await storage.createCategoryAttribute(attributeData);
    sendSuccess(res, newAttribute, 201);
  }));

  app.put("/api/categories/:categoryId/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const attributeData = insertCategoryAttributeSchema.partial().parse(req.body);
    const updatedAttribute = await storage.updateCategoryAttribute(id, attributeData);
    
    if (!updatedAttribute) {
      return sendError(res, "Category attribute not found", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, updatedAttribute);
  }));

  app.delete("/api/categories/:categoryId/attributes/:id", isAdmin, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const success = await storage.deleteCategoryAttribute(id);
    if (!success) {
      return sendError(res, "Category attribute not found or could not be deleted", 404, "NOT_FOUND");
    }
    
    sendSuccess(res, null, 204);
  }));

  // Category Attribute Options Routes
  app.get("/api/categories/:categoryId/attributes/:attributeId/options", handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    if (isNaN(attributeId)) {
      return sendError(res, "Invalid attribute ID", 400, "INVALID_ID");
    }

    const options = await storage.getCategoryAttributeOptions(attributeId);
    sendSuccess(res, options);
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
  
  // New endpoint to get filterable attributes for product listing when no specific category is selected
  app.get("/api/products/filterable-attributes", handleErrors(async (req: Request, res: Response) => {
    // Get product IDs from query params (optional)
    const productIds = req.query.productIds ? 
      (req.query.productIds as string).split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : 
      [];
    
    // Get all global attributes that are marked as filterable
    const allAttributes = await storage.getAttributes();
    const filterableAttributes = allAttributes.filter(attr => attr.isFilterable);
    
    // For each filterable attribute, collect all unique options used across products
    const result = [];
    
    for (const attribute of filterableAttributes) {
      const attributeWithOptions = {
        ...attribute,
        options: []
      };
      
      // If product IDs are provided, only check options for those products
      if (productIds.length > 0) {
        for (const productId of productIds) {
          // Get product attributes
          const productAttributes = await storage.getProductAttributes(productId);
          const matchingAttribute = productAttributes.find(pa => pa.attributeId === attribute.id);
          
          if (matchingAttribute) {
            // Get options for this product attribute
            const options = await storage.getProductAttributeOptions(matchingAttribute.id);
            
            // Add unique options to the result
            for (const option of options) {
              if (!attributeWithOptions.options.some(o => o.value === option.value)) {
                attributeWithOptions.options.push(option);
              }
            }
          }
        }
      } else {
        // Get all attribute options
        const globalOptions = await storage.getAttributeOptions(attribute.id);
        attributeWithOptions.options = globalOptions;
      }
      
      // Only include attributes that have options
      if (attributeWithOptions.options.length > 0) {
        result.push(attributeWithOptions);
      }
    }
    
    res.json(result);
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