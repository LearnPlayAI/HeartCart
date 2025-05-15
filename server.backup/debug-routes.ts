/**
 * Temporary debugging routes for development only
 * These routes should NOT be available in production
 */

import { Router, Request, Response } from 'express';
import { logger } from './logger';
import { objectStore } from './object-store';
import { storage } from './storage';
import { cleanupOrphanedDraftImages, cleanupAllOrphanedDraftImages } from './clean-orphaned-images';

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
  
  logger.info(`DEBUG: Cleaning up orphaned images for draft ${draftId} using enhanced method`);
  
  try {
    // Use our enhanced cleanup function
    const result = await cleanupOrphanedDraftImages(draftId);
    
    // Get details about the draft for context
    const draft = await storage.getProductDraft(draftId);
    const trackedObjectKeys = draft?.imageObjectKeys || [];
    
    // Get all possible files for this draft (post-cleanup)
    const allDraftFiles = await objectStore.listFiles(`drafts/${draftId}/`);
    
    // Return detailed results
    return res.json({
      success: true,
      draftId,
      cleanupResults: result,
      draftInfo: {
        exists: !!draft,
        trackedImages: {
          count: trackedObjectKeys.length,
          files: trackedObjectKeys
        },
        remainingFiles: {
          count: allDraftFiles.length,
          files: allDraftFiles
        }
      }
    });
  } catch (error) {
    logger.error(`DEBUG: Error in enhanced draft cleanup: ${draftId}`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      draftId
    });
  }
});

// Debug endpoint for cleaning up all drafts
router.get('/debug/cleanup-all-drafts', async (req: Request, res: Response) => {
  logger.info('DEBUG: Cleaning up orphaned images for all drafts using enhanced method');
  
  try {
    // Use our enhanced bulk cleanup function
    const result = await cleanupAllOrphanedDraftImages();
    
    return res.json({
      success: true,
      cleanupResults: result
    });
  } catch (error) {
    logger.error('DEBUG: Error in enhanced bulk draft cleanup', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Force cleanup of a specific draft folder, even if draft no longer exists
router.get('/real-debug/force-cleanup-draft-folder/:draftId', async (req: Request, res: Response) => {
  // Set headers to ensure this is treated as JSON
  res.setHeader('Content-Type', 'application/json');
  
  const draftId = parseInt(req.params.draftId);
  if (isNaN(draftId)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid draft ID' 
    });
  }
  
  logger.info(`DEBUG: Force cleaning up folder for deleted draft ${draftId}`);
  
  try {
    const draftPrefix = `drafts/${draftId}/`;
    const results = {
      deletedFiles: [] as string[],
      failedFiles: [] as string[]
    };
    
    // Get direct listing of all files using raw object store client
    const rawResult = await objectStore.getClient().list("");
    
    if ('err' in rawResult || !rawResult.value || !Array.isArray(rawResult.value)) {
      return res.status(500).json({
        success: false,
        error: `Error listing files: ${
          'err' in rawResult ? JSON.stringify(rawResult.err) : 'Unknown error'
        }`
      });
    }
    
    // Find files with the draft prefix
    for (const obj of rawResult.value) {
      if (obj && typeof obj === 'object') {
        let objectKey = null;
        
        // Try to extract the key/name property
        if ('key' in obj && obj.key && typeof obj.key === 'string') {
          objectKey = obj.key;
        } else if ('name' in obj && obj.name && typeof obj.name === 'string') {
          objectKey = obj.name;
        }
        
        // If we found a key that matches our draft prefix
        if (objectKey && objectKey.startsWith(draftPrefix)) {
          logger.info(`Found file to delete: ${objectKey}`);
          
          try {
            await objectStore.deleteFile(objectKey);
            const stillExists = await objectStore.exists(objectKey);
            
            if (!stillExists) {
              logger.info(`Successfully deleted file: ${objectKey}`);
              results.deletedFiles.push(objectKey);
            } else {
              logger.error(`Failed to delete file: ${objectKey}`);
              results.failedFiles.push(objectKey);
            }
          } catch (error) {
            logger.error(`Error deleting file ${objectKey}:`, { 
              error: error instanceof Error ? error.message : String(error) 
            });
            results.failedFiles.push(objectKey);
          }
        }
      }
    }
    
    return res.json({
      success: true,
      draftId,
      results
    });
  } catch (error) {
    logger.error(`Error in force cleanup for draft ${draftId}:`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;