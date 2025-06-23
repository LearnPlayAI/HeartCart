#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

// Define the schema inline for the import script
const pudoLockersTable = {
  tableName: 'pudo_lockers',
  insert: async (data) => {
    const query = `
      INSERT INTO pudo_lockers (
        code, provider, name, latitude, longitude, opening_hours, 
        address, detailed_address, locker_type, place, available_box_types, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (code) DO UPDATE SET
        provider = EXCLUDED.provider,
        name = EXCLUDED.name,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        opening_hours = EXCLUDED.opening_hours,
        address = EXCLUDED.address,
        detailed_address = EXCLUDED.detailed_address,
        locker_type = EXCLUDED.locker_type,
        place = EXCLUDED.place,
        available_box_types = EXCLUDED.available_box_types,
        is_active = EXCLUDED.is_active
    `;
    
    return await sql.unsafe(query, [
      data.code,
      data.provider,
      data.name,
      data.latitude,
      data.longitude,
      JSON.stringify(data.openingHours),
      data.address,
      JSON.stringify(data.detailedAddress),
      JSON.stringify(data.lockerType),
      JSON.stringify(data.place),
      JSON.stringify(data.availableBoxTypes),
      data.isActive
    ]);
  }
};

async function importPudoData() {
  try {
    console.log('Starting PUDO locker data import...');

    // Read the JSON file
    const jsonPath = join(__dirname, '..', 'attached_assets', 'lockers-data_1750662620133.json');
    const rawData = readFileSync(jsonPath, 'utf8');
    const lockersData = JSON.parse(rawData);

    console.log(`Found ${lockersData.length} lockers to import`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Process each locker
    for (const locker of lockersData) {
      try {
        // Transform the data to match our schema
        const transformedLocker = {
          code: locker.code,
          provider: locker.provider,
          name: locker.name,
          latitude: locker.latitude,
          longitude: locker.longitude,
          openingHours: locker.openinghours || [], // Note: API uses 'openinghours' not 'openingHours'
          address: locker.address,
          detailedAddress: locker.detailed_address || {},
          lockerType: locker.type || { id: 0, name: 'Unknown' },
          place: locker.place || {},
          availableBoxTypes: locker.lstTypesBoxes || [], // Note: API uses 'lstTypesBoxes'
          isActive: true // Default to active
        };

        // Validate required fields
        if (!transformedLocker.code || !transformedLocker.name) {
          console.warn(`Skipping locker with missing required fields: ${JSON.stringify(locker)}`);
          skipped++;
          continue;
        }

        // Insert into database
        await pudoLockersTable.insert(transformedLocker);
        imported++;

        if (imported % 100 === 0) {
          console.log(`Imported ${imported} lockers...`);
        }

      } catch (error) {
        console.error(`Error importing locker ${locker.code}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total lockers processed: ${lockersData.length}`);
    console.log(`Successfully imported: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);

    if (imported > 0) {
      console.log('\n✅ PUDO locker data import completed successfully!');
    } else {
      console.log('\n❌ No lockers were imported. Please check the data format.');
    }

  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the import
importPudoData().catch(console.error);