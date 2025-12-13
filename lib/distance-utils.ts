/**
 * Distance calculation utilities using Haversine formula
 * for calculating distances between geographic coordinates
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param coord1 First coordinate (user location)
 * @param coord2 Second coordinate (restaurant location)
 * @returns Distance in miles
 */
export function calculateDistanceMiles(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 3959; // Earth's radius in miles

  const lat1Rad = toRadians(coord1.latitude);
  const lat2Rad = toRadians(coord2.latitude);
  const deltaLat = toRadians(coord2.latitude - coord1.latitude);
  const deltaLon = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 * @param distanceMiles Distance in miles
 * @returns Formatted string like "3.3 miles away" or "0.2 miles away"
 */
export function formatDistance(distanceMiles: number | undefined | null): string {
  if (distanceMiles === undefined || distanceMiles === null || isNaN(distanceMiles)) {
    return "";
  }

  // Round to 1 decimal place
  const rounded = Math.round(distanceMiles * 10) / 10;
  
  // Handle very small distances
  if (rounded < 0.1) {
    return "< 0.1 miles away";
  }

  return `${rounded} miles away`;
}

/**
 * Get user's current location using browser geolocation API
 * @returns Promise with user coordinates or null if unavailable/denied
 */
export async function getUserLocation(): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser");
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn("Error getting user location:", error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  });
}
