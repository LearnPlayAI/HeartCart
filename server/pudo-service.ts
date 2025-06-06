import { db } from "./db";
import { pudoLockers, type PudoLocker, type InsertPudoLocker } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import NodeGeocoder from 'node-geocoder';

// Initialize geocoder for address to coordinates conversion
const geocoder = NodeGeocoder({
  provider: 'openstreetmap',
  formatter: null,
  extra: {
    userAgent: 'TeeMeYou-ECommerce/1.0 (contact@teemeyou.com)',
    headers: {
      'User-Agent': 'TeeMeYou-ECommerce/1.0 (contact@teemeyou.com)'
    }
  }
});

export interface PudoApiLocker {
  code: string;
  name: string;
  latitude: string;
  longitude: string;
  address: string;
  openinghours: Array<{
    day: string;
    open_time: string;
    close_time: string;
  }>;
  type: {
    id: number;
    name: string;
  };
  place: {
    placeNumber: string;
    town: string;
    postalCode: string;
  };
  lstTypesBoxes: Array<{
    id: number;
    name: string;
    type: string;
    width: number;
    height: number;
    length: number;
    weight: number;
  }>;
}

export interface LockerSearchResult {
  locker: PudoLocker;
  distance: number;
  distanceText: string;
}

export class PudoService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api-pudo.co.za';
  
  constructor() {
    const apiKey = process.env.PUDO_API_KEY;
    if (!apiKey) {
      throw new Error('PUDO_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Fetch all lockers from PUDO API and cache them
   */
  async syncLockersFromApi(): Promise<{ synced: number; errors: string[] }> {
    try {
      console.log('Fetching lockers from PUDO API...');
      
      const response = await fetch(`${this.baseUrl}/lockers-data`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`PUDO API request failed: ${response.status} ${response.statusText}`);
      }

      const apiLockers: PudoApiLocker[] = await response.json();
      console.log(`Retrieved ${apiLockers.length} lockers from PUDO API`);

      const errors: string[] = [];
      let synced = 0;

      for (const apiLocker of apiLockers) {
        try {
          const lockerData: InsertPudoLocker = {
            code: apiLocker.code,
            name: apiLocker.name,
            latitude: parseFloat(apiLocker.latitude),
            longitude: parseFloat(apiLocker.longitude),
            address: apiLocker.address,
            town: apiLocker.place.town,
            postalCode: apiLocker.place.postalCode,
            openingHours: apiLocker.openinghours,
            lockerType: apiLocker.type,
            availableBoxTypes: apiLocker.lstTypesBoxes,
            isActive: true,
            lastSyncedAt: new Date().toISOString()
          };

          // Upsert locker (insert or update if exists)
          await db
            .insert(pudoLockers)
            .values(lockerData)
            .onConflictDoUpdate({
              target: pudoLockers.code,
              set: {
                name: lockerData.name,
                latitude: lockerData.latitude,
                longitude: lockerData.longitude,
                address: lockerData.address,
                town: lockerData.town,
                postalCode: lockerData.postalCode,
                openingHours: lockerData.openingHours,
                lockerType: lockerData.lockerType,
                availableBoxTypes: lockerData.availableBoxTypes,
                lastSyncedAt: lockerData.lastSyncedAt,
                updatedAt: new Date().toISOString()
              }
            });

          synced++;
        } catch (error) {
          errors.push(`Error syncing locker ${apiLocker.code}: ${error}`);
          console.error(`Error syncing locker ${apiLocker.code}:`, error);
        }
      }

      console.log(`Successfully synced ${synced} lockers`);
      return { synced, errors };

    } catch (error) {
      console.error('Error fetching lockers from PUDO API:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display
   */
  private formatDistance(distance: number): string {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  }

  /**
   * Convert address to coordinates using geocoding with fallback for SA cities
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      console.log(`Geocoding address: ${address}`);
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const results = await geocoder.geocode(address + ', South Africa');
      
      if (results && results.length > 0) {
        const result = results[0];
        console.log(`Geocoded to: ${result.latitude}, ${result.longitude}`);
        return {
          lat: result.latitude || 0,
          lng: result.longitude || 0
        };
      }
      
      console.log('No geocoding results found, using fallback');
      return this.getFallbackCoordinates(address);
    } catch (error) {
      console.error('Geocoding error:', error);
      return this.getFallbackCoordinates(address);
    }
  }

  /**
   * Get fallback coordinates for major South African cities
   */
  private getFallbackCoordinates(address: string): { lat: number; lng: number } | null {
    const cityCoordinates: Record<string, { lat: number; lng: number }> = {
      'johannesburg': { lat: -26.2041, lng: 28.0473 },
      'cape town': { lat: -33.9249, lng: 18.4241 },
      'durban': { lat: -29.8587, lng: 31.0218 },
      'pretoria': { lat: -25.7479, lng: 28.2293 },
      'bloemfontein': { lat: -29.1217, lng: 26.2146 },
      'port elizabeth': { lat: -33.9608, lng: 25.6022 },
      'pietermaritzburg': { lat: -29.6088, lng: 30.3796 },
      'randburg': { lat: -26.0935, lng: 28.0094 },
      'sandton': { lat: -26.1076, lng: 28.0567 },
      'centurion': { lat: -25.8601, lng: 28.1888 },
      'midrand': { lat: -25.9885, lng: 28.1293 },
      'roodepoort': { lat: -26.1625, lng: 27.8744 },
      'kempton park': { lat: -26.1011, lng: 28.2305 }
    };
    
    const addressLower = address.toLowerCase();
    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (addressLower.includes(city)) {
        console.log(`Using fallback coordinates for ${city}`);
        return coords;
      }
    }
    
    // Default to Johannesburg if no city match found
    console.log('Using default Johannesburg coordinates');
    return cityCoordinates['johannesburg'];
  }

  /**
   * Find nearest lockers to an address
   */
  async findNearestLockers(
    address: string, 
    maxDistance: number = 10, 
    limit: number = 3
  ): Promise<LockerSearchResult[]> {
    // First geocode the address
    const coordinates = await this.geocodeAddress(address);
    if (!coordinates) {
      throw new Error('Could not geocode the provided address');
    }

    // Get all active lockers from cache
    const lockers = await db
      .select()
      .from(pudoLockers)
      .where(eq(pudoLockers.isActive, true));

    // Calculate distances and filter by max distance
    const lockersWithDistance: LockerSearchResult[] = lockers
      .map(locker => {
        const distance = this.calculateDistance(
          coordinates.lat,
          coordinates.lng,
          locker.latitude,
          locker.longitude
        );

        return {
          locker,
          distance,
          distanceText: this.formatDistance(distance)
        };
      })
      .filter(result => result.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return lockersWithDistance;
  }

  /**
   * Progressive distance search - increase distance until lockers are found
   */
  async findLockersWithFallback(
    address: string,
    preferredDistance: number = 10,
    fallbackDistance: number = 100
  ): Promise<{
    lockers: LockerSearchResult[];
    searchDistance: number;
    suggestion?: string;
  }> {
    // Try with preferred distance first
    let lockers = await this.findNearestLockers(address, preferredDistance, 3);
    
    if (lockers.length >= 1) {
      return {
        lockers,
        searchDistance: preferredDistance
      };
    }

    // If no lockers found, try with fallback distance
    console.log(`No lockers found within ${preferredDistance}km, trying ${fallbackDistance}km`);
    lockers = await this.findNearestLockers(address, fallbackDistance, 3);

    if (lockers.length === 0) {
      throw new Error(`No PUDO lockers found within ${fallbackDistance}km of the provided address`);
    }

    return {
      lockers,
      searchDistance: fallbackDistance,
      suggestion: `No lockers found within ${preferredDistance}km. Found ${lockers.length} locker(s) within ${fallbackDistance}km.`
    };
  }

  /**
   * Check if cache needs refresh (daily sync)
   */
  async shouldRefreshCache(): Promise<boolean> {
    try {
      const lastSync = await db
        .select({ lastSyncedAt: pudoLockers.lastSyncedAt })
        .from(pudoLockers)
        .orderBy(sql`${pudoLockers.lastSyncedAt} DESC`)
        .limit(1);

      if (lastSync.length === 0) {
        return true; // No data, needs sync
      }

      const lastSyncTime = new Date(lastSync[0].lastSyncedAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);

      return hoursDiff >= 24; // Refresh if older than 24 hours
    } catch (error) {
      console.error('Error checking cache refresh status:', error);
      return true; // Default to refresh on error
    }
  }

  /**
   * Get locker by code
   */
  async getLockerByCode(code: string): Promise<PudoLocker | null> {
    const result = await db
      .select()
      .from(pudoLockers)
      .where(eq(pudoLockers.code, code))
      .limit(1);

    return result[0] || null;
  }
}

// Export singleton instance
export const pudoService = new PudoService();