import { db } from "./db";
import { pudoLockers, type InsertPudoLocker } from "@shared/schema";

// Sample PUDO locker data based on real South African locations
const samplePudoLockers: InsertPudoLocker[] = [
  {
    code: "RB001",
    name: "PUDO Randburg Square",
    latitude: -26.0935,
    longitude: 28.0094,
    address: "375 Hendrik Potgieter Road, Randburg Square, Randburg, 2194, South Africa",
    town: "Randburg",
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
    longitude: 27.9876,
    address: "220 Beyers Naude Drive, Cresta, Randburg, 2194, South Africa",
    town: "Randburg",
    postalCode: "2194",
    openingHours: [
      { day: "Monday", open_time: "09:00", close_time: "19:00" },
      { day: "Tuesday", open_time: "09:00", close_time: "19:00" },
      { day: "Wednesday", open_time: "09:00", close_time: "19:00" },
      { day: "Thursday", open_time: "09:00", close_time: "19:00" },
      { day: "Friday", open_time: "09:00", close_time: "19:00" },
      { day: "Saturday", open_time: "09:00", close_time: "17:00" },
      { day: "Sunday", open_time: "10:00", close_time: "16:00" }
    ],
    lockerType: { id: 1, name: "Standard Locker" },
    availableBoxTypes: null,
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "SD001",
    name: "PUDO Sandton City",
    latitude: -26.1076,
    longitude: 28.0567,
    address: "Sandton City Shopping Centre, Rivonia Road, Sandton",
    town: "Sandton",
    postalCode: "2196",
    openingHours: [
      { day: "Monday", open_time: "09:00", close_time: "21:00" },
      { day: "Tuesday", open_time: "09:00", close_time: "21:00" },
      { day: "Wednesday", open_time: "09:00", close_time: "21:00" },
      { day: "Thursday", open_time: "09:00", close_time: "21:00" },
      { day: "Friday", open_time: "09:00", close_time: "21:00" },
      { day: "Saturday", open_time: "09:00", close_time: "19:00" },
      { day: "Sunday", open_time: "09:00", close_time: "17:00" }
    ],
    lockerType: { id: 2, name: "Premium Locker" },
    availableBoxTypes: [
      { id: 1, name: "Small", type: "S", width: 35, height: 35, length: 45, weight: 10 },
      { id: 2, name: "Medium", type: "M", width: 35, height: 50, length: 60, weight: 20 },
      { id: 3, name: "Large", type: "L", width: 50, height: 50, length: 80, weight: 30 },
      { id: 4, name: "Extra Large", type: "XL", width: 60, height: 60, length: 100, weight: 50 }
    ],
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "JH001",
    name: "PUDO Johannesburg CBD",
    latitude: -26.2041,
    longitude: 28.0473,
    address: "Carlton Centre, Commissioner Street, Johannesburg",
    town: "Johannesburg",
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
    availableBoxTypes: [
      { id: 1, name: "Small", type: "S", width: 35, height: 35, length: 45, weight: 10 },
      { id: 2, name: "Medium", type: "M", width: 35, height: 50, length: 60, weight: 20 }
    ],
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "MD001",
    name: "PUDO Midrand Gateway",
    latitude: -25.9885,
    longitude: 28.1293,
    address: "Midrand Gateway Shopping Centre, New Road, Midrand",
    town: "Midrand",
    postalCode: "1685",
    openingHours: [
      { day: "Monday", open_time: "09:00", close_time: "20:00" },
      { day: "Tuesday", open_time: "09:00", close_time: "20:00" },
      { day: "Wednesday", open_time: "09:00", close_time: "20:00" },
      { day: "Thursday", open_time: "09:00", close_time: "20:00" },
      { day: "Friday", open_time: "09:00", close_time: "20:00" },
      { day: "Saturday", open_time: "09:00", close_time: "18:00" },
      { day: "Sunday", open_time: "09:00", close_time: "17:00" }
    ],
    lockerType: { id: 1, name: "Standard Locker" },
    availableBoxTypes: [
      { id: 1, name: "Small", type: "S", width: 35, height: 35, length: 45, weight: 10 },
      { id: 2, name: "Medium", type: "M", width: 35, height: 50, length: 60, weight: 20 },
      { id: 3, name: "Large", type: "L", width: 50, height: 50, length: 80, weight: 30 }
    ],
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "RD001",
    name: "PUDO Roodepoort City",
    latitude: -26.1625,
    longitude: 27.8744,
    address: "Roodepoort City Shopping Centre, Ontdekkers Road, Roodepoort",
    town: "Roodepoort",
    postalCode: "1724",
    openingHours: [
      { day: "Monday", open_time: "09:00", close_time: "19:00" },
      { day: "Tuesday", open_time: "09:00", close_time: "19:00" },
      { day: "Wednesday", open_time: "09:00", close_time: "19:00" },
      { day: "Thursday", open_time: "09:00", close_time: "19:00" },
      { day: "Friday", open_time: "09:00", close_time: "19:00" },
      { day: "Saturday", open_time: "09:00", close_time: "17:00" },
      { day: "Sunday", open_time: "09:00", close_time: "16:00" }
    ],
    lockerType: { id: 1, name: "Standard Locker" },
    availableBoxTypes: [
      { id: 1, name: "Small", type: "S", width: 35, height: 35, length: 45, weight: 10 },
      { id: 2, name: "Medium", type: "M", width: 35, height: 50, length: 60, weight: 20 }
    ],
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "PT001",
    name: "PUDO Pretoria Menlyn",
    latitude: -25.7479,
    longitude: 28.2293,
    address: "Menlyn Park Shopping Centre, Atterbury Road, Pretoria",
    town: "Pretoria",
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
    lockerType: { id: 2, name: "Premium Locker" },
    availableBoxTypes: [
      { id: 1, name: "Small", type: "S", width: 35, height: 35, length: 45, weight: 10 },
      { id: 2, name: "Medium", type: "M", width: 35, height: 50, length: 60, weight: 20 },
      { id: 3, name: "Large", type: "L", width: 50, height: 50, length: 80, weight: 30 },
      { id: 4, name: "Extra Large", type: "XL", width: 60, height: 60, length: 100, weight: 50 }
    ],
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  },
  {
    code: "CT001",
    name: "PUDO Cape Town V&A Waterfront",
    latitude: -33.9249,
    longitude: 18.4241,
    address: "V&A Waterfront Shopping Centre, Dock Road, Cape Town",
    town: "Cape Town",
    postalCode: "8001",
    openingHours: [
      { day: "Monday", open_time: "09:00", close_time: "21:00" },
      { day: "Tuesday", open_time: "09:00", close_time: "21:00" },
      { day: "Wednesday", open_time: "09:00", close_time: "21:00" },
      { day: "Thursday", open_time: "09:00", close_time: "21:00" },
      { day: "Friday", open_time: "09:00", close_time: "21:00" },
      { day: "Saturday", open_time: "09:00", close_time: "21:00" },
      { day: "Sunday", open_time: "09:00", close_time: "19:00" }
    ],
    lockerType: { id: 2, name: "Premium Locker" },
    availableBoxTypes: [
      { id: 1, name: "Small", type: "S", width: 35, height: 35, length: 45, weight: 10 },
      { id: 2, name: "Medium", type: "M", width: 35, height: 50, length: 60, weight: 20 },
      { id: 3, name: "Large", type: "L", width: 50, height: 50, length: 80, weight: 30 }
    ],
    isActive: true,
    lastSyncedAt: new Date().toISOString()
  }
];

export async function populatePudoLockers() {
  try {
    console.log('Populating PUDO lockers database...');
    
    for (const locker of samplePudoLockers) {
      await db
        .insert(pudoLockers)
        .values(locker)
        .onConflictDoUpdate({
          target: pudoLockers.code,
          set: {
            name: locker.name,
            latitude: locker.latitude,
            longitude: locker.longitude,
            address: locker.address,
            town: locker.town,
            postalCode: locker.postalCode,
            openingHours: locker.openingHours,
            lockerType: locker.lockerType,
            availableBoxTypes: locker.availableBoxTypes,
            lastSyncedAt: locker.lastSyncedAt,
            updatedAt: new Date().toISOString()
          }
        });
    }
    
    console.log(`Successfully populated ${samplePudoLockers.length} PUDO lockers`);
    return { success: true, count: samplePudoLockers.length };
  } catch (error) {
    console.error('Error populating PUDO lockers:', error);
    throw error;
  }
}