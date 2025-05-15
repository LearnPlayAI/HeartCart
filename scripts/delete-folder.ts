// One-time script to delete a specific folder from Replit Object Store
import { objectStore } from '../server/object-store';

async function deleteFolder() {
  console.log('Initializing object store...');
  await objectStore.initialize();
  console.log('Object store initialized successfully');
  
  const folder = 'drafts/98';
  console.log(`Attempting to delete folder: ${folder}`);
  
  try {
    // 1. Try using the deleteFolder method for a direct deletion
    const result = await objectStore.getClient().deleteFolder(folder);
    console.log('Delete folder result:', result);
    
    // 2. Try listing the contents to verify
    const listing = await objectStore.getClient().list(folder);
    console.log('Listing after delete attempt:', listing);
    
    console.log('Operation complete');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  }
}

// Run the script
deleteFolder().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});