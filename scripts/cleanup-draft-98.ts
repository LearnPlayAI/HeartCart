// One-time script to clean up orphaned images for draft 98
import { objectStore } from '../server/object-store';

async function cleanupDraft98() {
  console.log('Starting cleanup of draft 98...');
  
  try {
    const draftId = 98;
    const draftPrefix = `drafts/${draftId}/`;
    const results = {
      deletedFiles: [] as string[],
      failedFiles: [] as string[]
    };
    
    // Initialize the object store
    await objectStore.initialize();
    console.log('Object store initialized successfully');
    
    // Get direct listing of all files using raw object store client
    console.log('Listing all files in object store...');
    const rawResult = await objectStore.getClient().list("");
    
    if ('err' in rawResult || !rawResult.value || !Array.isArray(rawResult.value)) {
      console.error(`Error listing files: ${
        'err' in rawResult ? JSON.stringify(rawResult.err) : 'Unknown error'
      }`);
      return;
    }
    
    // Log all files in the object store first
    console.log('All files in object store:');
    let totalFiles = 0;
    for (const obj of rawResult.value) {
      let objectKey = null;
      if (obj && typeof obj === 'object') {
        if ('key' in obj && obj.key && typeof obj.key === 'string') {
          objectKey = obj.key;
        } else if ('name' in obj && obj.name && typeof obj.name === 'string') {
          objectKey = obj.name;
        }
        
        if (objectKey) {
          totalFiles++;
          console.log(`  ${objectKey}`);
        }
      }
    }
    console.log(`Total files found: ${totalFiles}`);
    
    // Find files with the draft prefix
    console.log('\nSearching for draft 98 files...');
    
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
          console.log(`Found file to delete: ${objectKey}`);
          
          try {
            await objectStore.deleteFile(objectKey);
            console.log(`Successfully deleted file: ${objectKey}`);
            results.deletedFiles.push(objectKey);
          } catch (error) {
            console.error(`Error deleting file ${objectKey}:`, error instanceof Error ? error.message : String(error));
            results.failedFiles.push(objectKey);
          }
        }
      }
    }
    
    console.log('\n--- CLEANUP RESULTS ---');
    console.log(`Deleted files (${results.deletedFiles.length}):`);
    results.deletedFiles.forEach(file => console.log(` - ${file}`));
    
    console.log(`\nFailed files (${results.failedFiles.length}):`);
    results.failedFiles.forEach(file => console.log(` - ${file}`));
    
    console.log('\nCleanup complete!');
  } catch (error) {
    console.error('Error in cleanup script:', error instanceof Error ? error.message : String(error));
  }
}

// Run the cleanup
cleanupDraft98().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});