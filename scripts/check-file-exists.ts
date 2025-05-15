// Script to check if a specific file exists in the object store
import { objectStore } from '../server/object-store';

async function checkFileExists() {
  console.log('Initializing object store...');
  await objectStore.initialize();
  console.log('Object store initialized successfully');
  
  // Try to get the file from the screenshot
  const fileKey = 'drafts/98/WhatsApp-Image-2025-05-08-at-12.25.32-1-1747306037245-7wjosg73vds.jpeg';
  console.log(`Checking if file exists: ${fileKey}`);
  
  const exists = await objectStore.exists(fileKey);
  console.log(`File ${fileKey} exists: ${exists}`);
  
  if (exists) {
    try {
      // Try to delete it
      console.log('Attempting to delete the file...');
      await objectStore.deleteFile(fileKey);
      const stillExists = await objectStore.exists(fileKey);
      console.log(`File deletion status: ${stillExists ? 'Failed' : 'Successful'}`);
    } catch (error) {
      console.error('Error deleting file:', error instanceof Error ? error.message : String(error));
    }
  }
}

// Run the check
checkFileExists().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});