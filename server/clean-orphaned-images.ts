/**
 * This utility script will scan for orphaned images in the object store
 * and delete any that don't have corresponding database records
 */

import { storage } from './storage';
import { objectStore } from './object-store';
import { logger } from './logger';

export async function cleanupOrphanedDraftImages(draftId: number): Promise<{
  deleted: string[];
  failed: string[];
}> {
  logger.info(`Starting cleanup of orphaned images for draft ${draftId}`);
  
  try {
    // Step 1: Get the draft record to see what images should actually be there
    const draft = await storage.getProductDraft(draftId);
    if (!draft) {
      logger.warn(`Draft ${draftId} not found, cannot clean orphaned images`);
      return { deleted: [], failed: [] };
    }

    // Step 2: Get all tracked images from the database
    const trackedObjectKeys = draft.imageObjectKeys || [];
    logger.info(`Draft ${draftId} has ${trackedObjectKeys.length} tracked images`);
    
    // Step 3: List all files in the draft folder in the object store
    const draftPrefix = `drafts/${draftId}/`;
    logger.info(`Listing all files in ${draftPrefix}`);
    const allDraftFiles = await objectStore.listFiles(draftPrefix);
    logger.info(`Found ${allDraftFiles.length} files in object store for draft ${draftId}`);
    
    // Step 4: Find orphaned files (files in the store but not tracked in the DB)
    const orphanedFiles = allDraftFiles.filter(file => !trackedObjectKeys.includes(file));
    logger.info(`Found ${orphanedFiles.length} orphaned files for draft ${draftId}`);
    
    // Step 5: Delete each orphaned file
    const deleted: string[] = [];
    const failed: string[] = [];
    
    for (const file of orphanedFiles) {
      try {
        logger.info(`Deleting orphaned file: ${file}`);
        await objectStore.deleteFile(file);
        deleted.push(file);
      } catch (error) {
        logger.error(`Failed to delete orphaned file ${file}`, { 
          error: error instanceof Error ? error.message : String(error) 
        });
        failed.push(file);
      }
    }
    
    logger.info(`Cleanup complete for draft ${draftId}. Deleted: ${deleted.length}, Failed: ${failed.length}`);
    return { deleted, failed };
  } catch (error) {
    logger.error(`Error cleaning orphaned images for draft ${draftId}`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return { deleted: [], failed: [] };
  }
}

export async function cleanupAllOrphanedDraftImages(): Promise<{
  totalCleaned: number;
  totalFailed: number;
  draftsCleaned: number;
}> {
  logger.info('Starting cleanup of all orphaned draft images');
  
  try {
    // Step 1: Get all drafts from the database
    const drafts = await storage.getAllDrafts();
    logger.info(`Found ${drafts.length} drafts to check for orphaned images`);
    
    let totalCleaned = 0;
    let totalFailed = 0;
    let draftsCleaned = 0;
    
    // Step 2: Clean each draft
    for (const draft of drafts) {
      const { deleted, failed } = await cleanupOrphanedDraftImages(draft.id);
      
      if (deleted.length > 0) {
        draftsCleaned++;
        totalCleaned += deleted.length;
      }
      
      totalFailed += failed.length;
    }
    
    logger.info(`All drafts cleaned. Total files deleted: ${totalCleaned}, Failed: ${totalFailed}, Drafts with cleanup: ${draftsCleaned}`);
    return { totalCleaned, totalFailed, draftsCleaned };
  } catch (error) {
    logger.error('Error cleaning all orphaned draft images', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return { totalCleaned: 0, totalFailed: 0, draftsCleaned: 0 };
  }
}