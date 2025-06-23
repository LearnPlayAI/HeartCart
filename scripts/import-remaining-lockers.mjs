import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { pudoLockers } from '../shared/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);
const db = drizzle(sql);

async function importRemainingLockers() {
  try {
    console.log('Starting remaining PUDO locker data import...');
    
    // Read the JSON file
    const jsonData = readFileSync('../attached_assets/lockers-data_1750662620133.json', 'utf8');
    const lockers = JSON.parse(jsonData);
    
    console.log(`Found ${lockers.length} total lockers`);
    
    // Get already imported locker codes
    const existingLockers = await db.select({ code: pudoLockers.code }).from(pudoLockers);
    const existingCodes = new Set(existingLockers.map(l => l.code));
    
    console.log(`${existingCodes.size} lockers already imported`);
    
    // Filter out already imported lockers
    const remainingLockers = lockers.filter(locker => !existingCodes.has(locker.code));
    
    console.log(`${remainingLockers.length} lockers remaining to import`);
    
    if (remainingLockers.length === 0) {
      console.log('All lockers already imported!');
      return;
    }
    
    // Import in batches of 50
    const batchSize = 50;
    let imported = 0;
    
    for (let i = 0; i < remainingLockers.length; i += batchSize) {
      const batch = remainingLockers.slice(i, i + batchSize);
      
      const lockerData = batch.map(locker => ({
        code: locker.code,
        provider: locker.provider,
        name: locker.name,
        latitude: locker.latitude,
        longitude: locker.longitude,
        openingHours: locker.opening_hours || [],
        address: locker.address,
        detailedAddress: locker.detailed_address || {},
        lockerType: locker.locker_type || { id: 0, name: 'Standard' },
        place: locker.place || {},
        availableBoxTypes: locker.available_box_types || [],
        isActive: true
      }));
      
      await db.insert(pudoLockers).values(lockerData);
      imported += batch.length;
      
      console.log(`Imported ${imported} of ${remainingLockers.length} remaining lockers...`);
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Successfully imported ${imported} additional lockers!`);
    
    // Final count
    const totalCount = await db.select().from(pudoLockers).then(rows => rows.length);
    console.log(`Total lockers in database: ${totalCount}`);
    
  } catch (error) {
    console.error('Error importing lockers:', error);
  } finally {
    await sql.end();
  }
}

importRemainingLockers();