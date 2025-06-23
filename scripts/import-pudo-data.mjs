import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString);

async function importPudoLockers() {
  try {
    console.log('Starting PUDO lockers import...');
    
    // Read the lockers data file
    const lockersDataPath = path.join(process.cwd(), 'attached_assets/lockers-data_1750662620133.json');
    const lockersData = JSON.parse(fs.readFileSync(lockersDataPath, 'utf8'));
    
    console.log(`Found ${lockersData.length} lockers to import`);
    
    // Clear existing data
    console.log('Clearing existing PUDO lockers...');
    await sql`DELETE FROM "pudoLockers"`;
    
    // Insert new data in batches
    const batchSize = 10;
    let imported = 0;
    
    for (let i = 0; i < lockersData.length; i += batchSize) {
      const batch = lockersData.slice(i, i + batchSize);
      
      for (const locker of batch) {
        try {
          await sql`
            INSERT INTO "pudoLockers" (
              "code", "provider", "name", "latitude", "longitude", "openingHours", 
              "address", "detailedAddress", "lockerType", "place", "availableBoxTypes", 
              "isActive", "createdAt", "updatedAt"
            ) VALUES (
              ${locker.code},
              ${locker.provider},
              ${locker.name},
              ${locker.latitude},
              ${locker.longitude},
              ${JSON.stringify(locker.openinghours || [])},
              ${locker.address},
              ${JSON.stringify(locker.detailed_address || {})},
              ${JSON.stringify(locker.type || {})},
              ${JSON.stringify(locker.place || {})},
              ${JSON.stringify(locker.lstTypesBoxes || [])},
              ${true},
              ${new Date().toISOString()},
              ${new Date().toISOString()}
            )
          `;
          imported++;
        } catch (error) {
          console.warn(`Warning: Failed to import locker ${locker.code}:`, error.message);
        }
      }
      
      console.log(`Imported ${imported}/${lockersData.length} lockers`);
    }
    
    console.log('✅ PUDO lockers import completed successfully!');
    console.log(`Total imported: ${imported} lockers`);
    
  } catch (error) {
    console.error('❌ Error importing PUDO lockers:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the import
importPudoLockers();