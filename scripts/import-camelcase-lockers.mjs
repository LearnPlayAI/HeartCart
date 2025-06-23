#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = postgres(DATABASE_URL);

async function importLockers() {
  try {
    console.log('Starting PUDO locker import to camelCase table...');
    
    // Read the JSON file
    const jsonPath = join(process.cwd(), 'attached_assets', 'lockers-data_1750662620133.json');
    const rawData = readFileSync(jsonPath, 'utf8');
    const lockers = JSON.parse(rawData);
    
    console.log(`Found ${lockers.length} lockers in JSON file`);
    
    let imported = 0;
    
    for (const locker of lockers) {
      try {
        // Map JSON fields to camelCase columns
        const lockerData = {
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
          isActive: true
        };
        
        await sql`
          INSERT INTO "pudoLockers" (
            code, provider, name, latitude, longitude, "openingHours",
            address, "detailedAddress", "lockerType", place, "availableBoxTypes", "isActive"
          ) VALUES (
            ${lockerData.code},
            ${lockerData.provider},
            ${lockerData.name},
            ${lockerData.latitude},
            ${lockerData.longitude},
            ${JSON.stringify(lockerData.openingHours)},
            ${lockerData.address},
            ${JSON.stringify(lockerData.detailedAddress)},
            ${JSON.stringify(lockerData.lockerType)},
            ${JSON.stringify(lockerData.place)},
            ${JSON.stringify(lockerData.availableBoxTypes)},
            ${lockerData.isActive}
          )
          ON CONFLICT (code) DO UPDATE SET
            provider = EXCLUDED.provider,
            name = EXCLUDED.name,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            "openingHours" = EXCLUDED."openingHours",
            address = EXCLUDED.address,
            "detailedAddress" = EXCLUDED."detailedAddress",
            "lockerType" = EXCLUDED."lockerType",
            place = EXCLUDED.place,
            "availableBoxTypes" = EXCLUDED."availableBoxTypes",
            "isActive" = EXCLUDED."isActive"
        `;
        
        imported++;
        
        if (imported % 100 === 0) {
          console.log(`Imported ${imported} lockers...`);
        }
        
      } catch (error) {
        console.error(`Error importing locker ${locker.code}:`, error);
      }
    }
    
    // Verify the count
    const result = await sql`SELECT COUNT(*) as count FROM "pudoLockers" WHERE "isActive" = true`;
    const finalCount = result[0].count;
    
    console.log(`✅ Import complete! ${imported} lockers imported.`);
    console.log(`✅ Total active lockers in database: ${finalCount}`);
    
    if (finalCount != 1394) {
      console.error(`❌ Expected 1394 lockers, but found ${finalCount}`);
    }
    
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

importLockers();