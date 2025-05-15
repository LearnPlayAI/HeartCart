// One-time script to delete folders from Replit Object Store
import { objectStore } from '../server/object-store';

async function deleteFolder(folder: string) {
  console.log(`Attempting to delete folder: ${folder}`);

  try {
    // First list all files in the folder
    console.log(`Listing files in folder: ${folder}`);
    const files = await objectStore.listFiles(folder, true);

    console.log(`Found ${files.length} files to delete`);

    // Delete each file in the folder
    for (const file of files) {
      try {
        await objectStore.deleteFile(file);
        console.log(`Successfully deleted: ${file}`);
      } catch (error) {
        console.error(`Failed to delete ${file}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Try raw API to ensure no files were missed
    console.log('\nListing all files in object store to find folder contents...');
    const rawClient = objectStore.getClient();
    const rawResult = await rawClient.list(folder, { recursive: true });

    if ('err' in rawResult) {
      console.error(`Error listing files: ${JSON.stringify(rawResult.err)}`);
    } else {
      console.log('Raw folder listing result:', rawResult);

      // Try to delete any remaining files found in raw listing
      if (rawResult.value && Array.isArray(rawResult.value)) {
        for (const obj of rawResult.value) {
          if (obj && typeof obj === 'object' && 'key' in obj && typeof obj.key === 'string') {
            try {
              await objectStore.deleteFile(obj.key);
              console.log(`Deleted remaining file: ${obj.key}`);
            } catch (deleteErr) {
              console.error(`Failed to delete remaining file ${obj.key}:`, deleteErr);
            }
          }
        }
      }
    }

    console.log(`Folder deletion attempt complete for: ${folder}`);
  } catch (error) {
    console.error(`Error deleting folder ${folder}:`, error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  // Get all root folders first
  try {
    // You can list specific folders you want to delete
    const foldersToDelete = [
      'products',
      'categories',
      'suppliers',
      'catalogs',
      'temp',
      'drafts',
      'public',
      'private'
    ];

    for (const folder of foldersToDelete) {
      await deleteFolder(folder);
    }

    console.log("\nAttempting to find any remaining files or folders...");
    // List root directory to find any remaining folders
    const allFiles = await objectStore.listFiles("");
    console.log(`Found ${allFiles.length} items at root level:`, allFiles);

    // Delete any remaining root files
    for (const file of allFiles) {
      try {
        await objectStore.deleteFile(file);
        console.log(`Deleted root item: ${file}`);
      } catch (error) {
        console.error(`Failed to delete root item ${file}:`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log("Completed folder/file deletion process");
  } catch (error) {
    console.error("Error in folder deletion process:", error instanceof Error ? error.message : String(error));
  }
}

// Run the script
main().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
});