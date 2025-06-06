import { db } from "./db";
import { pudoLockers, type InsertPudoLocker } from "@shared/schema";
import { eq } from "drizzle-orm";

// Sample PUDO locker data based on real South African locations
const samplePudoLockers: InsertPudoLocker[] = [
  {
    code: "RB001",
    name: "PUDO Randburg Square",
    latitude: -26.0935,
    longitude: 28.0094,
    address: "375 Hendrik Potgieter Road, Randburg Square, Randburg, 2194, South Africa",
    town: "Randburg",
    province: "Gauteng",
    postalCode: "2194",
    openingHours: [
      { day: "Monday", open_time: "08:00", close_time: "20:00" },
      { day: "Tuesday", open_time: "08:00", close_time: "20:00" },
      { day: "Wednesday", open_time: "08:00", close_time: "20:00" },
      { day: "Thursday", open_time: "08:00", close_time: "20:00" },
      { day: "Friday", open_time: "08:00", close_time: "20:00" },
      { day: "Saturday", open_time: "09:00", close_time: "17:00" },
      { day: "Sunday", open_time: "09:00", close_time: "15:00" }
    ],
    lockerType: { id: 1, name: "Standard Locker" },
    availableBoxTypes: null,
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "RB002",
    name: "PUDO Cresta Shopping Centre",
    latitude: -26.1123,
    longitude: 27.9765,
    address: "Cresta Shopping Centre, Cnr Beyers Naude Dr & Weltevreden Rd, Blackheath, Randburg, 2195",
    town: "Randburg",
    province: "Gauteng",
    postalCode: "2195",
    openingHours: [
      { day: "Monday", open_time: "09:00", close_time: "21:00" },
      { day: "Tuesday", open_time: "09:00", close_time: "21:00" },
      { day: "Wednesday", open_time: "09:00", close_time: "21:00" },
      { day: "Thursday", open_time: "09:00", close_time: "21:00" },
      { day: "Friday", open_time: "09:00", close_time: "21:00" },
      { day: "Saturday", open_time: "09:00", close_time: "17:00" },
      { day: "Sunday", open_time: "09:00", close_time: "17:00" }
    ],
    lockerType: { id: 1, name: "Standard Locker" },
    availableBoxTypes: null,
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "SN001",
    name: "PUDO Sandton City",
    latitude: -26.1076,
    longitude: 28.0567,
    address: "Sandton City Shopping Centre, 83 Rivonia Rd, Sandhurst, Sandton, 2196",
    town: "Sandton",
    province: "Gauteng",
    postalCode: "2196",
    openingHours: [
      { day: "Monday", open_time: "09:00", close_time: "21:00" },
      { day: "Tuesday", open_time: "09:00", close_time: "21:00" },
      { day: "Wednesday", open_time: "09:00", close_time: "21:00" },
      { day: "Thursday", open_time: "09:00", close_time: "21:00" },
      { day: "Friday", open_time: "09:00", close_time: "21:00" },
      { day: "Saturday", open_time: "09:00", close_time: "19:00" },
      { day: "Sunday", open_time: "09:00", close_time: "19:00" }
    ],
    lockerType: { id: 1, name: "Standard Locker" },
    availableBoxTypes: null,
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "JB001",
    name: "PUDO Johannesburg CBD",
    latitude: -26.2041,
    longitude: 28.0473,
    address: "Carlton Centre, 150 Commissioner Street, Johannesburg, 2001",
    town: "Johannesburg",
    province: "Gauteng",
    postalCode: "2001",
    openingHours: [
      { day: "Monday", open_time: "08:00", close_time: "18:00" },
      { day: "Tuesday", open_time: "08:00", close_time: "18:00" },
      { day: "Wednesday", open_time: "08:00", close_time: "18:00" },
      { day: "Thursday", open_time: "08:00", close_time: "18:00" },
      { day: "Friday", open_time: "08:00", close_time: "18:00" },
      { day: "Saturday", open_time: "09:00", close_time: "15:00" },
      { day: "Sunday", open_time: "Closed", close_time: "Closed" }
    ],
    lockerType: { id: 1, name: "Standard Locker" },
    availableBoxTypes: null,
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "CT001",
    name: "PUDO V&A Waterfront",
    latitude: -33.9022,
    longitude: 18.4186,
    address: "V&A Waterfront, Dock Road, Cape Town, 8001",
    town: "Cape Town",
    province: "Western Cape",
    postalCode: "8001",
    openingHours: [
      { day: "Monday", open_time: "09:00", close_time: "21:00" },
      { day: "Tuesday", open_time: "09:00", close_time: "21:00" },
      { day: "Wednesday", open_time: "09:00", close_time: "21:00" },
      { day: "Thursday", open_time: "09:00", close_time: "21:00" },
      { day: "Friday", open_time: "09:00", close_time: "21:00" },
      { day: "Saturday", open_time: "09:00", close_time: "21:00" },
      { day: "Sunday", open_time: "09:00", close_time: "21:00" }
    ],
    lockerType: { id: 1, name: "Standard Locker" },
    availableBoxTypes: null,
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "CT002",
    name: "PUDO Canal Walk",
    latitude: -33.8906,
    longitude: 18.5121,
    address: "Canal Walk Shopping Centre, Century Boulevard, Cape Town, 7441",
    town: "Cape Town",
    province: "Western Cape",
    postalCode: "7441",
    openingHours: [
      { day: "Monday", open_time: "09:00", close_time: "21:00" },
      { day: "Tuesday", open_time: "09:00", close_time: "21:00" },
      { day: "Wednesday", open_time: "09:00", close_time: "21:00" },
      { day: "Thursday", open_time: "09:00", close_time: "21:00" },
      { day: "Friday", open_time: "09:00", close_time: "21:00" },
      { day: "Saturday", open_time: "09:00", close_time: "19:00" },
      { day: "Sunday", open_time: "09:00", close_time: "19:00" }
    ],
    lockerType: { id: 1, name: "Standard Locker" },
    availableBoxTypes: null,
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "DB001",
    name: "PUDO Gateway Theatre",
    latitude: -29.8154,
    longitude: 31.0206,
    address: "Gateway Theatre of Shopping, 1 Palm Boulevard, Umhlanga, Durban, 4319",
    town: "Durban",
    province: "KwaZulu-Natal",
    postalCode: "4319",
    openingHours: [
      { day: "Monday", open_time: "09:00", close_time: "21:00" },
      { day: "Tuesday", open_time: "09:00", close_time: "21:00" },
      { day: "Wednesday", open_time: "09:00", close_time: "21:00" },
      { day: "Thursday", open_time: "09:00", close_time: "21:00" },
      { day: "Friday", open_time: "09:00", close_time: "21:00" },
      { day: "Saturday", open_time: "09:00", close_time: "19:00" },
      { day: "Sunday", open_time: "09:00", close_time: "19:00" }
    ],
    lockerType: { id: 1, name: "Standard Locker" },
    availableBoxTypes: null,
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "PT001",
    name: "PUDO Menlyn Park",
    latitude: -25.7860,
    longitude: 28.2764,
    address: "Menlyn Park Shopping Centre, Cnr Atterbury & Lois Avenue, Menlyn, Pretoria, 0181",
    town: "Pretoria",
    province: "Gauteng",
    postalCode: "0181",
    openingHours: [
      { day: "Monday", open_time: "09:00", close_time: "21:00" },
      { day: "Tuesday", open_time: "09:00", close_time: "21:00" },
      { day: "Wednesday", open_time: "09:00", close_time: "21:00" },
      { day: "Thursday", open_time: "09:00", close_time: "21:00" },
      { day: "Friday", open_time: "09:00", close_time: "21:00" },
      { day: "Saturday", open_time: "09:00", close_time: "19:00" },
      { day: "Sunday", open_time: "09:00", close_time: "17:00" }
    ],
    lockerType: { id: 1, name: "Standard Locker" },
    availableBoxTypes: null,
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "BF001",
    name: "PUDO Mimosa Mall",
    latitude: -29.1217,
    longitude: 26.2146,
    address: "Mimosa Mall, Cnr Nelson Mandela & Henry Street, Bloemfontein, 9301",
    town: "Bloemfontein",
    province: "Free State",
    postalCode: "9301",
    openingHours: [
      { day: "Monday", open_time: "09:00", close_time: "20:00" },
      { day: "Tuesday", open_time: "09:00", close_time: "20:00" },
      { day: "Wednesday", open_time: "09:00", close_time: "20:00" },
      { day: "Thursday", open_time: "09:00", close_time: "20:00" },
      { day: "Friday", open_time: "09:00", close_time: "20:00" },
      { day: "Saturday", open_time: "09:00", close_time: "17:00" },
      { day: "Sunday", open_time: "09:00", close_time: "15:00" }
    ],
    lockerType: { id: 1, name: "Standard Locker" },
    availableBoxTypes: null,
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "PE001",
    name: "PUDO Greenacres Shopping Centre",
    latitude: -33.9608,
    longitude: 25.6022,
    address: "Greenacres Shopping Centre, Cnr Cape Road & 10th Avenue, Newton Park, Gqeberha, 6045",
    town: "Gqeberha",
    province: "Eastern Cape",
    postalCode: "6045",
    openingHours: [
      { day: "Monday", open_time: "09:00", close_time: "20:00" },
      { day: "Tuesday", open_time: "09:00", close_time: "20:00" },
      { day: "Wednesday", open_time: "09:00", close_time: "20:00" },
      { day: "Thursday", open_time: "09:00", close_time: "20:00" },
      { day: "Friday", open_time: "09:00", close_time: "20:00" },
      { day: "Saturday", open_time: "09:00", close_time: "17:00" },
      { day: "Sunday", open_time: "09:00", close_time: "15:00" }
    ],
    lockerType: { id: 1, name: "Standard Locker" },
    availableBoxTypes: null,
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "CG54",
    name: "Sasol Rivonia Uplifted",
    latitude: -26.0502,
    longitude: 28.0615,
    address: "Sasol Rivonia, Cnr Rivonia Boulevard & Grayston Drive, Rivonia, Sandton, 2128",
    town: "Sandton",
    province: "Gauteng",
    postalCode: "2128",
    openingHours: [
      { day: "Monday", open_time: "06:00", close_time: "22:00" },
      { day: "Tuesday", open_time: "06:00", close_time: "22:00" },
      { day: "Wednesday", open_time: "06:00", close_time: "22:00" },
      { day: "Thursday", open_time: "06:00", close_time: "22:00" },
      { day: "Friday", open_time: "06:00", close_time: "22:00" },
      { day: "Saturday", open_time: "06:00", close_time: "22:00" },
      { day: "Sunday", open_time: "06:00", close_time: "22:00" }
    ],
    lockerType: { id: 2, name: "Petrol Station Locker" },
    availableBoxTypes: ["Small", "Medium", "Large"],
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  }
];

/**
 * Populate the database with sample PUDO locker data
 */
export async function populatePudoLockers() {
  try {
    console.log('Clearing existing PUDO lockers...');
    await db.delete(pudoLockers);
    
    console.log('Inserting sample PUDO lockers...');
    const insertedLockers = await db.insert(pudoLockers).values(samplePudoLockers).returning();
    
    console.log(`Successfully inserted ${insertedLockers.length} PUDO lockers`);
    return insertedLockers;
  } catch (error) {
    console.error('Failed to populate PUDO lockers:', error);
    throw error;
  }
}

/**
 * Get all active PUDO lockers
 */
export async function getAllPudoLockers() {
  try {
    const lockers = await db.select().from(pudoLockers).where(eq(pudoLockers.isActive, true));
    console.log(`Found ${lockers.length} active PUDO lockers`);
    return lockers;
  } catch (error) {
    console.error('Failed to fetch PUDO lockers:', error);
    throw error;
  }
}