#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = postgres(connectionString);
const db = drizzle(sql);

// Import schema
const { pudoLockers } = await import('../shared/schema.ts');

async function reimportAuthenticLockers() {
  try {
    console.log('Starting authentic PUDO locker reimport...');
    
    // Read the authentic JSON file
    const jsonPath = path.join(__dirname, '..', 'attached_assets', 'lockers-data_1750662620133.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    const lockers = JSON.parse(jsonData);
    
    console.log(`Found ${lockers.length} authentic lockers in JSON file`);
    
    if (lockers.length !== 1394) {
      throw new Error(`Expected exactly 1394 lockers, but found ${lockers.length}`);
    }

    // Transform and insert authentic data
    const transformedLockers = lockers.map(locker => ({
      code: locker.code,
      provider: locker.provider,
      name: locker.name,
      latitude: parseFloat(locker.latitude),
      longitude: parseFloat(locker.longitude),
      openingHours: locker.openinghours,
      address: locker.address,
      detailedAddress: locker.detailed_address,
      type: locker.type,
      place: locker.place,
      lstTypesBoxes: locker.lstTypesBoxes,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Insert in batches to avoid memory issues
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < transformedLockers.length; i += batchSize) {
      const batch = transformedLockers.slice(i, i + batchSize);
      
      await db.insert(pudoLockers).values(batch);
      insertedCount += batch.length;
      
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${insertedCount}/${transformedLockers.length} lockers`);
    }

    // Verify final count
    const finalCount = await db.select({ count: sql`count(*)` }).from(pudoLockers);
    const recordCount = finalCount[0].count;
    
    console.log(`✅ Reimport complete! Final count: ${recordCount} authentic PUDO lockers`);
    
    if (recordCount !== 1394) {
      throw new Error(`Expected 1394 records, but database contains ${recordCount}`);
    }
    
    console.log('✅ Data integrity verified: Exactly 1394 authentic records imported');
    
  } catch (error) {
    console.error('❌ Error during reimport:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the reimport
reimportAuthenticLockers()
  .then(() => {
    console.log('🎉 Authentic PUDO locker reimport completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Reimport failed:', error);
    process.exit(1);
  });