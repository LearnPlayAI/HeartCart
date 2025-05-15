/**
 * Temporary debugging routes for development only
 * These routes should NOT be available in production
 */

import { Router, Request, Response } from 'express';
import { logger } from './logger';
import { objectStore } from './object-store';
import { storage } from './storage';

const router = Router();

// Direct debug endpoint to delete an image from object store
router.get('/debug/delete-object/:objectKey(*)', async (req: Request, res: Response) => {
  const objectKey = req.params.objectKey;
  
  logger.info(`DEBUG: Attempting to delete object: ${objectKey}`);
  
  try {
    // Check if file exists first
    const exists = await objectStore.exists(objectKey);
    if (!exists) {
      return res.json({
        success: false,
        error: `File does not exist: ${objectKey}`
      });
    }
    
    // Attempt to delete the file with enhanced logging
    logger.info(`DEBUG: File exists, attempting deletion: ${objectKey}`);
    await objectStore.deleteFile(objectKey);
    
    // Verify deletion
    const stillExists = await objectStore.exists(objectKey);
    
    return res.json({
      success: !stillExists,
      objectKey,
      existedBefore: exists,
      existsAfter: stillExists,
      message: stillExists ? 'Failed to delete, file still exists' : 'File successfully deleted'
    });
  } catch (error) {
    logger.error(`DEBUG: Error deleting object: ${objectKey}`, { error });
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      objectKey
    });
  }
});

// Debug endpoint to list all files in a folder/directory
router.get('/debug/list-directory/:directory(*)', async (req: Request, res: Response) => {
  const directory = req.params.directory;
  
  logger.info(`DEBUG: Listing directory: ${directory}`);
  
  try {
    const files = await objectStore.listFiles(directory);
    
    return res.json({
      success: true,
      directory,
      fileCount: files.length,
      files
    });
  } catch (error) {
    logger.error(`DEBUG: Error listing directory: ${directory}`, { error });
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      directory
    });
  }
});

// Debug endpoint for draft cleanup - without authentication
router.get('/debug/cleanup-draft/:draftId', async (req: Request, res: Response) => {
  const draftId = parseInt(req.params.draftId);
  if (isNaN(draftId)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid draft ID' 
    });
  }
  
  logger.info(`DEBUG: Cleaning up orphaned images for draft ${draftId}`);
  
  try {
    // Step 1: Get the draft record to see what images should be there
    const draft = await storage.getProductDraft(draftId);
    if (!draft) {
      return res.status(404).json({ 
        success: false, 
        error: `Draft ${draftId} not found` 
      });
    }

    // Step 2: Get all tracked images from the database
    const trackedObjectKeys = draft.imageObjectKeys || [];
    
    // Step 3: List all files in the draft folder
    const draftPrefix = `drafts/${draftId}/`;
    const allDraftFiles = await objectStore.listFiles(draftPrefix);
    
    // Step 4: Find orphaned files
    const orphanedFiles = allDraftFiles.filter(file => 
      !trackedObjectKeys.includes(file)
    );
    
    const results = {
      draftId,
      trackedImages: {
        count: trackedObjectKeys.length,
        files: trackedObjectKeys
      },
      actualImages: {
        count: allDraftFiles.length,
        files: allDraftFiles
      },
      orphanedImages: {
        count: orphanedFiles.length,
        files: orphanedFiles
      }
    };
    
    // Step 5: Attempt to delete each orphaned file
    const deleteResults = [];
    
    for (const file of orphanedFiles) {
      try {
        const existsBefore = await objectStore.exists(file);
        await objectStore.deleteFile(file);
        const existsAfter = await objectStore.exists(file);
        
        deleteResults.push({
          file,
          existedBefore: existsBefore,
          existsAfter: existsAfter,
          success: !existsAfter
        });
      } catch (error) {
        deleteResults.push({
          file,
          error: error instanceof Error ? error.message : String(error),
          success: false
        });
      }
    }
    
    return res.json({
      success: true,
      data: results,
      deleteResults
    });
  } catch (error) {
    logger.error(`DEBUG: Error in draft cleanup: ${draftId}`, { error });
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      draftId
    });
  }
});

export default router;