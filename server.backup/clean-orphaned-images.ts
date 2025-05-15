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
    
    // Step 3: Approach differently - first try to list ALL files in object store
    logger.info(`Enhanced listing approach for draft ${draftId}`);
    
    // Get all files from the object store
    const rawResult = await objectStore.getClient().list("");
    
    if ('err' in rawResult || !rawResult.value || !Array.isArray(rawResult.value)) {
      logger.error(`Error listing all files: ${
        'err' in rawResult ? JSON.stringify(rawResult.err) : 'Unknown error'
      }`);
      return { deleted: [], failed: [] };
    }
    
    // Find all files that match our draft ID pattern
    const draftPrefix = `drafts/${draftId}/`;
    logger.info(`Looking for files with prefix: ${draftPrefix}`);
    
    const allDraftFiles: string[] = [];
    
    // Process all objects, looking for any that match our draft prefix
    for (const obj of rawResult.value) {
      if (obj && typeof obj === 'object') {
        let objectKey = null;
        
        // Try to extract the key/name property
        if ('key' in obj && obj.key && typeof obj.key === 'string') {
          objectKey = obj.key;
        } else if ('name' in obj && obj.name && typeof obj.name === 'string') {
          objectKey = obj.name;
        }
        
        // If we found a key that matches our draft prefix, add it to the list
        if (objectKey && objectKey.startsWith(draftPrefix)) {
          logger.info(`Found file for draft ${draftId}: ${objectKey}`);
          allDraftFiles.push(objectKey);
        }
      }
    }
    
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
        
        // Verify deletion
        const stillExists = await objectStore.exists(file);
        if (!stillExists) {
          logger.info(`Successfully deleted orphaned file: ${file}`);
          deleted.push(file);
        } else {
          logger.error(`Failed to delete orphaned file ${file}: File still exists after deletion attempt`);
          failed.push(file);
        }
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
  processedDrafts: number[];
}> {
  logger.info('Starting enhanced cleanup of all orphaned draft images');
  
  try {
    // Step 1: First take an optimized approach - scan all files once
    logger.info('Retrieving all files from object store');
    
    // Get all files from the object store
    const rawResult = await objectStore.getClient().list("");
    
    if ('err' in rawResult || !rawResult.value || !Array.isArray(rawResult.value)) {
      logger.error(`Error listing all files: ${
        'err' in rawResult ? JSON.stringify(rawResult.err) : 'Unknown error'
      }`);
      return { totalCleaned: 0, totalFailed: 0, draftsCleaned: 0, processedDrafts: [] };
    }
    
    logger.info(`Retrieved ${rawResult.value.length} total objects from store`);
    
    // Create map of draft IDs to files
    const draftFilesMap = new Map<number, string[]>();
    
    // Process all objects to find draft files
    for (const obj of rawResult.value) {
      if (obj && typeof obj === 'object') {
        let objectKey = null;
        
        // Try to extract the key/name property
        if ('key' in obj && obj.key && typeof obj.key === 'string') {
          objectKey = obj.key;
        } else if ('name' in obj && obj.name && typeof obj.name === 'string') {
          objectKey = obj.name;
        }
        
        // If we found a key that starts with "drafts/"
        if (objectKey && objectKey.startsWith('drafts/')) {
          // Extract the draft ID from the path
          const match = objectKey.match(/^drafts\/(\d+)\//);
          if (match && match[1]) {
            const draftId = parseInt(match[1], 10);
            if (!isNaN(draftId)) {
              // Add to map
              if (!draftFilesMap.has(draftId)) {
                draftFilesMap.set(draftId, []);
              }
              draftFilesMap.get(draftId)!.push(objectKey);
            }
          }
        }
      }
    }
    
    logger.info(`Found ${draftFilesMap.size} drafts with files in object store`);
    
    // Step 2: Get all drafts from the database
    const drafts = await storage.getAllDrafts();
    logger.info(`Found ${drafts.length} drafts to check for orphaned images`);
    
    let totalCleaned = 0;
    let totalFailed = 0;
    let draftsCleaned = 0;
    const processedDrafts: number[] = [];
    
    // Step 3: Clean each draft that has files
    for (const draft of drafts) {
      // Skip drafts with no files in object store
      if (!draftFilesMap.has(draft.id)) {
        logger.info(`Skipping draft ${draft.id} - no files in object store`);
        continue;
      }
      
      // Get all files for this draft from our map
      const allDraftFiles = draftFilesMap.get(draft.id) || [];
      
      // Get tracked files from the database
      const trackedObjectKeys = draft.imageObjectKeys || [];
      
      // Find orphaned files
      const orphanedFiles = allDraftFiles.filter(file => !trackedObjectKeys.includes(file));
      
      if (orphanedFiles.length === 0) {
        logger.info(`No orphaned files for draft ${draft.id}`);
        continue;
      }
      
      logger.info(`Found ${orphanedFiles.length} orphaned files for draft ${draft.id}`);
      
      // Delete orphaned files
      let deletedForDraft = 0;
      let failedForDraft = 0;
      
      for (const file of orphanedFiles) {
        try {
          logger.info(`Deleting orphaned file: ${file}`);
          await objectStore.deleteFile(file);
          
          // Verify deletion
          const stillExists = await objectStore.exists(file);
          if (!stillExists) {
            deletedForDraft++;
          } else {
            failedForDraft++;
          }
        } catch (error) {
          logger.error(`Failed to delete orphaned file ${file}`, {
            error: error instanceof Error ? error.message : String(error)
          });
          failedForDraft++;
        }
      }
      
      // Update totals
      if (deletedForDraft > 0) {
        draftsCleaned++;
        totalCleaned += deletedForDraft;
      }
      totalFailed += failedForDraft;
      processedDrafts.push(draft.id);
      
      logger.info(`Cleaned draft ${draft.id}: ${deletedForDraft} deleted, ${failedForDraft} failed`);
    }
    
    logger.info(`All drafts cleaned. Total files deleted: ${totalCleaned}, Failed: ${totalFailed}, Drafts with cleanup: ${draftsCleaned}`);
    return { totalCleaned, totalFailed, draftsCleaned, processedDrafts };
  } catch (error) {
    logger.error('Error cleaning all orphaned draft images', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return { totalCleaned: 0, totalFailed: 0, draftsCleaned: 0, processedDrafts: [] };
  }
}