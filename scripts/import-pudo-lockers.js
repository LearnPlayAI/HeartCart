const fs = require('fs');
const path = require('path');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { pudoLockers } = require('../shared/schema.ts');

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

async function importPudoLockers() {
  try {
    console.log('Starting PUDO lockers import...');
    
    // Read the lockers data file
    const lockersDataPath = path.join(__dirname, '../attached_assets/lockers-data_1750662620133.json');
    const lockersData = JSON.parse(fs.readFileSync(lockersDataPath, 'utf8'));
    
    console.log(`Found ${lockersData.length} lockers to import`);
    
    // Transform the data to match our schema
    const transformedLockers = lockersData.map(locker => ({
      code: locker.code,
      provider: locker.provider,
      name: locker.name,
      latitude: locker.latitude,
      longitude: locker.longitude,
      openingHours: locker.openinghours || [],
      address: locker.address,
      detailedAddress: locker.detailed_address || {},
      lockerType: locker.type || {},
      place: locker.place || {},
      availableBoxTypes: locker.lstTypesBoxes || [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    // Clear existing data
    console.log('Clearing existing PUDO lockers...');
    await db.delete(pudoLockers);
    
    // Insert new data in batches
    const batchSize = 50;
    let imported = 0;
    
    for (let i = 0; i < transformedLockers.length; i += batchSize) {
      const batch = transformedLockers.slice(i, i + batchSize);
      await db.insert(pudoLockers).values(batch);
      imported += batch.length;
      console.log(`Imported ${imported}/${transformedLockers.length} lockers`);
    }
    
    console.log('✅ PUDO lockers import completed successfully!');
    
  } catch (error) {
    console.error('❌ Error importing PUDO lockers:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the import
importPudoLockers();