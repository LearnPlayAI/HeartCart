/**
 * Batch Upload Routes
 * 
 * Defines routes for handling the batch upload of products via CSV files.
 * Supports multi-value attributes through comma-separated values.
 */

import { Router, Request, Response } from 'express';
import { isAdmin } from './auth-middleware';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { batchUploadService } from './batch-upload-service';
import { sendSuccess, sendError } from './api-response';

const router = Router();

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueId = uuidv4().substring(0, 8);
    const originalName = file.originalname.replace(/\s+/g, '_');
    const fileName = `${Date.now()}_${uniqueId}_${originalName}`;
    cb(null, fileName);
  }
});

// File filter to only accept CSV files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'application/csv'];
  const allowedExtensions = ['.csv'];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

// Error handling middleware
const handleErrors = (fn: Function) => async (req: Request, res: Response) => {
  try {
    await fn(req, res);
  } catch (error) {
    console.error('Error in batch upload routes:', error);
    sendError(res, {
      message: error.message || 'An error occurred during batch processing',
      code: 'BATCH_PROCESSING_ERROR',
      details: process.env.NODE_ENV === 'production' ? undefined : error.stack
    }, 500);
  }
};

/**
 * @route POST /api/batch-upload/start
 * @desc Start a new batch upload job
 * @access Admin only
 */
router.post('/start', isAdmin, handleErrors(async (req: Request, res: Response) => {
  const { name, description, catalogId } = req.body;
  
  if (!name) {
    return sendError(res, {
      message: 'Batch name is required',
      code: 'MISSING_BATCH_NAME'
    }, 400);
  }
  
  const batchUpload = await batchUploadService.createBatchUpload({
    name,
    description: description || null,
    userId: req.user?.id,
    catalogId: catalogId || null,
    status: 'pending'
  });
  
  return sendSuccess(res, batchUpload);
}));

/**
 * @route POST /api/batch-upload/:id/upload
 * @desc Upload a CSV file for an existing batch job
 * @access Admin only
 */
router.post('/:id/upload', isAdmin, upload.single('file'), handleErrors(async (req: Request, res: Response) => {
  const batchId = parseInt(req.params.id);
  const file = req.file;
  
  if (!file) {
    return sendError(res, {
      message: 'No file uploaded',
      code: 'NO_FILE_UPLOADED'
    }, 400);
  }
  
  const result = await batchUploadService.processCsvFile(batchId, {
    originalname: file.originalname,
    path: file.path,
    size: file.size
  });
  
  if (result.success) {
    return sendSuccess(res, result.data);
  } else {
    return sendError(res, result.error, 400);
  }
}));

/**
 * @route GET /api/batch-upload
 * @desc Get all batch uploads
 * @access Admin only
 */
router.get('/', isAdmin, handleErrors(async (req: Request, res: Response) => {
  const batches = await batchUploadService.getAllBatchUploads(req.user?.id);
  return sendSuccess(res, batches);
}));

/**
 * @route GET /api/batch-upload/:id
 * @desc Get a batch upload by ID
 * @access Admin only
 */
router.get('/:id', isAdmin, handleErrors(async (req: Request, res: Response) => {
  const batchId = parseInt(req.params.id);
  const batch = await batchUploadService.getBatchUpload(batchId);
  
  if (!batch) {
    return sendError(res, {
      message: `Batch upload with ID ${batchId} not found`,
      code: 'BATCH_NOT_FOUND'
    }, 404);
  }
  
  return sendSuccess(res, batch);
}));

/**
 * @route GET /api/batch-upload/:id/errors
 * @desc Get errors for a specific batch upload
 * @access Admin only
 */
router.get('/:id/errors', isAdmin, handleErrors(async (req: Request, res: Response) => {
  const batchId = parseInt(req.params.id);
  const errors = await batchUploadService.getBatchErrors(batchId);
  return sendSuccess(res, errors);
}));

/**
 * @route DELETE /api/batch-upload/:id
 * @desc Delete a batch upload and all its errors
 * @access Admin only
 */
router.delete('/:id', isAdmin, handleErrors(async (req: Request, res: Response) => {
  const batchId = parseInt(req.params.id);
  await batchUploadService.deleteBatchUpload(batchId);
  return sendSuccess(res, { message: 'Batch upload deleted successfully' });
}));

/**
 * @route POST /api/batch-upload/:id/cancel
 * @desc Cancel a batch upload
 * @access Admin only
 */
router.post('/:id/cancel', isAdmin, handleErrors(async (req: Request, res: Response) => {
  const batchId = parseInt(req.params.id);
  const result = await batchUploadService.cancelBatchUpload(batchId);
  
  if (result.success) {
    return sendSuccess(res, result.data);
  } else {
    return sendError(res, result.error, 400);
  }
}));

/**
 * @route POST /api/batch-upload/:id/pause
 * @desc Pause a batch upload
 * @access Admin only
 */
router.post('/:id/pause', isAdmin, handleErrors(async (req: Request, res: Response) => {
  const batchId = parseInt(req.params.id);
  const result = await batchUploadService.pauseBatchUpload(batchId);
  
  if (result.success) {
    return sendSuccess(res, result.data);
  } else {
    return sendError(res, result.error, 400);
  }
}));

/**
 * @route POST /api/batch-upload/:id/resume
 * @desc Resume a paused batch upload
 * @access Admin only
 */
router.post('/:id/resume', isAdmin, handleErrors(async (req: Request, res: Response) => {
  const batchId = parseInt(req.params.id);
  const result = await batchUploadService.resumeBatchUpload(batchId);
  
  if (result.success) {
    return sendSuccess(res, result.data);
  } else {
    return sendError(res, result.error, 400);
  }
}));

/**
 * @route POST /api/batch-upload/:id/retry
 * @desc Retry a failed batch upload
 * @access Admin only
 */
router.post('/:id/retry', isAdmin, handleErrors(async (req: Request, res: Response) => {
  const batchId = parseInt(req.params.id);
  const result = await batchUploadService.retryBatchUpload(batchId);
  
  if (result.success) {
    return sendSuccess(res, result.data);
  } else {
    return sendError(res, result.error, 400);
  }
}));

/**
 * @route GET /api/batch-upload/template
 * @desc Generate a template CSV file
 * @access Admin only
 */
router.get('/template', isAdmin, handleErrors(async (req: Request, res: Response) => {
  let catalogId: number | undefined = undefined;
  let catalogName = "generic";
  
  try {
    if (req.query.catalogId && req.query.catalogId !== 'none' && req.query.catalogId !== 'undefined') {
      const parsedId = parseInt(req.query.catalogId as string);
      // Only use the parsed ID if it's a valid number
      if (!isNaN(parsedId)) {
        catalogId = parsedId;
        
        // Try to get catalog name for the filename
        const db = (await import('./db')).db;
        const { catalogs } = await import('@shared/schema');
        const { eq } = await import('drizzle-orm');
        
        const [catalog] = await db.select({ name: catalogs.name })
          .from(catalogs)
          .where(eq(catalogs.id, catalogId));
          
        if (catalog?.name) {
          catalogName = catalog.name.toLowerCase().replace(/\s+/g, '_');
        }
      }
    }
    
    const csvContent = await batchUploadService.generateTemplateCsv(catalogId);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="product_upload_template_${catalogName}_${Date.now()}.csv"`);
    
    return res.send(csvContent);
  } catch (error) {
    console.error("Error generating template:", error);
    // Fallback to generic template if anything goes wrong
    try {
      const csvContent = await batchUploadService.generateTemplateCsv(undefined);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="product_upload_template_generic_${Date.now()}.csv"`);
      
      return res.send(csvContent);
    } catch (fallbackError) {
      console.error("Critical error generating fallback template:", fallbackError);
      return sendError(res, {
        message: "Failed to generate template. Please try again later.",
        code: "TEMPLATE_GENERATION_FAILED"
      }, 500);
    }
  }
}));

/**
 * @route GET /api/batch-upload/template/:catalogId
 * @desc Generate a template CSV file for a specific catalog
 * @access Admin only
 */
router.get('/template/:catalogId', isAdmin, handleErrors(async (req: Request, res: Response) => {
  let catalogId: number | undefined = undefined;
  let catalogName = "generic";
  
  try {
    if (req.params.catalogId && req.params.catalogId !== 'none' && req.params.catalogId !== 'undefined') {
      const parsedId = parseInt(req.params.catalogId);
      // Only use the parsed ID if it's a valid number
      if (!isNaN(parsedId)) {
        catalogId = parsedId;
        
        // Try to get catalog name for the filename
        const db = (await import('./db')).db;
        const { catalogs } = await import('@shared/schema');
        const { eq } = await import('drizzle-orm');
        
        const [catalog] = await db.select({ name: catalogs.name })
          .from(catalogs)
          .where(eq(catalogs.id, catalogId));
          
        if (catalog?.name) {
          catalogName = catalog.name.toLowerCase().replace(/\s+/g, '_');
        }
      }
    }
    
    const csvContent = await batchUploadService.generateTemplateCsv(catalogId);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="product_upload_template_${catalogName}_${Date.now()}.csv"`);
    
    return res.send(csvContent);
  } catch (error) {
    console.error("Error generating template with catalog ID:", error);
    // Fallback to generic template if anything goes wrong
    try {
      const csvContent = await batchUploadService.generateTemplateCsv(undefined);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="product_upload_template_generic_${Date.now()}.csv"`);
      
      return res.send(csvContent);
    } catch (fallbackError) {
      console.error("Critical error generating fallback template:", fallbackError);
      return sendError(res, {
        message: "Failed to generate template. Please try again later.",
        code: "TEMPLATE_GENERATION_FAILED"
      }, 500);
    }
  }
}));

export default router;