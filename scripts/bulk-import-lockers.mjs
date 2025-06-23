#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = postgres(DATABASE_URL);

async function bulkImportLockers() {
  try {
    console.log('Starting bulk PUDO locker import...');
    
    // Read the JSON file
    const jsonPath = join(process.cwd(), 'attached_assets', 'lockers-data_1750662620133.json');
    const rawData = readFileSync(jsonPath, 'utf8');
    const lockers = JSON.parse(rawData);
    
    console.log(`Found ${lockers.length} lockers in JSON file`);
    
    // Process in batches of 50 for efficiency
    const batchSize = 50;
    let totalImported = 0;
    
    for (let i = 0; i < lockers.length; i += batchSize) {
      const batch = lockers.slice(i, i + batchSize);
      
      const values = batch.map(locker => [
        locker.code,
        locker.provider,
        locker.name,
        locker.latitude,
        locker.longitude,
        JSON.stringify(locker.openinghours || []),
        locker.address,
        JSON.stringify(locker.detailed_address || {}),
        JSON.stringify(locker.type || {}),
        JSON.stringify(locker.place || {}),
        JSON.stringify(locker.lstTypesBoxes || []),
        true
      ]);
      
      await sql`
        INSERT INTO "pudoLockers" (
          code, provider, name, latitude, longitude, "openingHours",
          address, "detailedAddress", "lockerType", place, "availableBoxTypes", "isActive"
        ) VALUES ${sql(values)}
      `;
      
      totalImported += batch.length;
      console.log(`Imported ${totalImported}/${lockers.length} lockers...`);
    }
    
    // Verify final count
    const result = await sql`SELECT COUNT(*) as count FROM "pudoLockers" WHERE "isActive" = true`;
    const finalCount = result[0].count;
    
    console.log(`✅ Bulk import complete! ${totalImported} lockers imported.`);
    console.log(`✅ Total active lockers in database: ${finalCount}`);
    
    if (finalCount != 1394) {
      console.error(`❌ Expected 1394 lockers, but found ${finalCount}`);
    } else {
      console.log(`✅ Perfect! All 1,394 authentic PUDO lockers imported successfully.`);
    }
    
  } catch (error) {
    console.error('Bulk import failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

bulkImportLockers();