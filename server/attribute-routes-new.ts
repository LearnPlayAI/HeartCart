import express, { type Request, Response } from "express";
import { executeQuery } from "./database";
import { isAuthenticated } from "./auth-middleware-new";
import asyncHandler from "express-async-handler";

const router = express.Router();

// Get all attributes
router.get("/api/attributes", asyncHandler(async (req: Request, res: Response) => {
  const query = "SELECT * FROM product_attributes ORDER BY sort_order ASC, name ASC";
  const result = await executeQuery(query);
  
  res.json({
    success: true,
    data: result.rows
  });
}));

// Get attribute options
router.get("/api/attributes/:attributeId/options", asyncHandler(async (req: Request, res: Response) => {
  const { attributeId } = req.params;
  
  const query = "SELECT * FROM product_attribute_options WHERE attribute_id = $1 ORDER BY sort_order ASC, display_value ASC";
  const result = await executeQuery(query, [attributeId]);
  
  res.json({
    success: true,
    data: result.rows
  });
}));

export default router;