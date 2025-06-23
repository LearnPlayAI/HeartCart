#!/usr/bin/env node

import fs from 'fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, serial, text, real, boolean, jsonb } from 'drizzle-orm/pg-core';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

// Define the table schema inline
const pudoLockers = pgTable('pudo_lockers', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  provider: text('provider').notNull(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  openingHours: jsonb('opening_hours').notNull(),
  detailedAddress: jsonb('detailed_address').notNull(),
  place: jsonb('place').notNull(),
  typeInfo: jsonb('type_info').notNull(),
  boxTypes: jsonb('box_types').notNull(),
  isActive: boolean('is_active').notNull().default(true)
});

async function importAllLockers() {
  try {
    console.log('Starting complete PUDO locker import...');
    
    // Read the JSON file
    const jsonData = JSON.parse(fs.readFileSync('../attached_assets/lockers-data_1750662620133.json', 'utf8'));
    console.log(`Found ${jsonData.length} lockers in JSON file`);
    
    // Check current count in database
    const currentCount = await db.select().from(pudoLockers);
    console.log(`Current lockers in database: ${currentCount.length}`);
    
    // Get existing codes to avoid duplicates
    const existingCodes = new Set(currentCount.map(locker => locker.code));
    
    // Filter out already imported lockers
    const newLockers = jsonData.filter(locker => !existingCodes.has(locker.code));
    console.log(`New lockers to import: ${newLockers.length}`);
    
    if (newLockers.length === 0) {
      console.log('All lockers already imported!');
      return;
    }
    
    // Process in batches of 50 to avoid memory issues
    const batchSize = 50;
    let imported = 0;
    
    for (let i = 0; i < newLockers.length; i += batchSize) {
      const batch = newLockers.slice(i, i + batchSize);
      
      const lockerData = batch.map(locker => ({
        code: locker.code,
        provider: locker.provider,
        name: locker.name,
        address: locker.address,
        latitude: parseFloat(locker.latitude),
        longitude: parseFloat(locker.longitude),
        openingHours: locker.openinghours,
        detailedAddress: locker.detailed_address,
        place: locker.place,
        typeInfo: locker.type,
        boxTypes: locker.lstTypesBoxes,
        isActive: true
      }));
      
      await db.insert(pudoLockers).values(lockerData);
      imported += batch.length;
      
      console.log(`Imported batch ${Math.floor(i/batchSize) + 1}: ${imported}/${newLockers.length} lockers`);
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Verify final count
    const finalCount = await db.select().from(pudoLockers);
    console.log(`Import complete! Final count: ${finalCount.length} lockers`);
    console.log(`Expected: 1394, Actual: ${finalCount.length}`);
    
    if (finalCount.length === 1394) {
      console.log('✅ SUCCESS: All 1394 lockers successfully imported!');
    } else {
      console.log(`⚠️  WARNING: Expected 1394 but got ${finalCount.length}`);
    }
    
  } catch (error) {
    console.error('Error importing lockers:', error);
    throw error;
  } finally {
    await client.end();
  }
}

importAllLockers().catch(console.error);