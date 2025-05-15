// One-time script to delete a specific folder from Replit Object Store
import { objectStore } from '../server/object-store';

async function deleteFolder() {
  console.log('Initializing object store...');
  await objectStore.initialize();
  console.log('Object store initialized successfully');
  
  const folder = 'drafts/98/';
  console.log(`Attempting to forcefully clean folder: ${folder}`);
  
  try {
    // Try direct deletion of specific files first from the screenshot
    const specificFiles = [
      'drafts/98/WhatsApp-Image-2025-05-08-at-12.25.32-1-1747300372451-7wjosg73vds.jpeg',
      'drafts/98/WhatsApp-Image-2025-05-08-at-12.25.32-17473003724659-e0vfhzc92a.jpeg',
      'drafts/98/WhatsApp-Image-2025-05-08-at-12.25.32-2-17473003724659-z4s5lwhnbt.jpeg'
    ];
    
    console.log('Attempting to delete specific files from screenshot:');
    for (const file of specificFiles) {
      try {
        await objectStore.deleteFile(file);
        console.log(`Successfully deleted: ${file}`);
      } catch (error) {
        console.error(`Failed to delete ${file}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    // Direct attempt on files visible in UI
    const uiFiles = [
      'drafts/98/WhatsApp-Image-2025-05-08-at-12.25.32-1-1747306037245-7wjosg73vds.jpeg',
      'drafts/98/WhatsApp-Image-2025-05-08-at-12.25.32-17473060372469-e0vfhzc92a.jpeg',
      'drafts/98/WhatsApp-Image-2025-05-08-at-12.25.32-2-17473060372465-z4s5lwhnbt.jpeg'
    ];
    
    console.log('\nAttempting to delete files as shown in UI:');
    for (const file of uiFiles) {
      try {
        await objectStore.deleteFile(file);
        console.log(`Successfully deleted: ${file}`);
      } catch (error) {
        console.error(`Failed to delete ${file}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    // Try raw API to ensure no files were missed
    console.log('\nListing all files in object store to find folder contents...');
    const rawResult = await objectStore.getClient().list(folder, { recursive: true });
    
    if ('err' in rawResult) {
      console.error(`Error listing files: ${
        'err' in rawResult ? JSON.stringify(rawResult.err) : 'Unknown error'
      }`);
    } else {
      console.log('Raw folder listing result:', rawResult);
    }
    
    // Use a different method - list the root first
    console.log('\nTrying folder listing with explicit prefix check...');
    const rootResult = await objectStore.getClient().list('');
    
    if (!('err' in rootResult) && rootResult.value && Array.isArray(rootResult.value)) {
      console.log(`Found ${rootResult.value.length} total files in root listing`);
      
      const matchingFiles = rootResult.value.filter(obj => {
        let key = null;
        if (obj && typeof obj === 'object') {
          if ('key' in obj && obj.key && typeof obj.key === 'string') {
            key = obj.key;
          } else if ('name' in obj && obj.name && typeof obj.name === 'string') {
            key = obj.name;
          }
        }
        return key && key.startsWith(folder);
      });
      
      console.log(`Found ${matchingFiles.length} files matching the folder prefix`);
      
      for (const obj of matchingFiles) {
        const key = 'key' in obj && obj.key ? obj.key : 
                   'name' in obj && obj.name ? obj.name : null;
        
        if (key) {
          console.log(`Deleting file: ${key}`);
          try {
            await objectStore.deleteFile(key);
            console.log(`Successfully deleted: ${key}`);
          } catch (error) {
            console.error(`Failed to delete ${key}:`, error instanceof Error ? error.message : String(error));
          }
        }
      }
    }
    
    // Try deleting the folder itself
    try {
      await objectStore.getClient().delete(folder);
      console.log(`Attempted to delete folder itself: ${folder}`);
      
      // Additional try with the folder without trailing slash
      await objectStore.getClient().delete(folder.slice(0, -1));
      console.log(`Attempted to delete folder (no trailing slash): ${folder.slice(0, -1)}`);
    } catch (error) {
      console.log(`Note: Could not delete folder itself: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log('Operation complete - please check if files are still visible in the UI');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  }
}

// Run the script
deleteFolder().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});