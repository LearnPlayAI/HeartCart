import { type Request, Response, NextFunction } from "express";
import { executeQuery } from "./database";
import "./session-types";

export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      error: { message: "Authentication required" }
    });
  }

  try {
    // Verify user still exists and is active
    const result = await executeQuery(
      'SELECT id, is_active FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        error: { message: "Authentication required" }
      });
    }

    next();
  } catch (error) {
    console.error('Authentication check failed:', error);
    return res.status(500).json({
      success: false,
      error: { message: "Authentication check failed" }
    });
  }
}

export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      error: { message: "Authentication required" }
    });
  }

  try {
    // Verify user is admin
    const result = await executeQuery(
      'SELECT id, is_admin FROM users WHERE id = $1 AND is_active = true',
      [req.session.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({
        success: false,
        error: { message: "Admin access required" }
      });
    }

    next();
  } catch (error) {
    console.error('Admin check failed:', error);
    return res.status(500).json({
      success: false,
      error: { message: "Admin check failed" }
    });
  }
}