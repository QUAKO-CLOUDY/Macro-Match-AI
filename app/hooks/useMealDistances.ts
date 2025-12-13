"use client";

import { useState, useEffect, useMemo } from "react";
import type { Meal } from "../types";
import { getUserLocation, calculateDistanceMiles, type Coordinates } from "@/lib/distance-utils";

/**
 * Custom hook to get user location and calculate distances for meals
 * @param meals Array of meals to calculate distances for
 * @returns Object with userLocation and meals with calculated distances
 */
export function useMealDistances(meals: Meal[]) {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Get user location on mount
  useEffect(() => {
    const loadUserLocation = async () => {
      setIsLoadingLocation(true);
      
      // Try to get saved location from localStorage first
      if (typeof window !== "undefined") {
        const savedLocation = localStorage.getItem("userLocation");
        if (savedLocation) {
          try {
            const parsed = JSON.parse(savedLocation);
            if (parsed.latitude && parsed.longitude) {
              setUserLocation(parsed);
              setIsLoadingLocation(false);
              return;
            }
          } catch (e) {
            console.warn("Failed to parse saved location:", e);
          }
        }
      }

      // Try browser geolocation
      const location = await getUserLocation();
      if (location) {
        setUserLocation(location);
        // Save to localStorage for future use
        if (typeof window !== "undefined") {
          localStorage.setItem("userLocation", JSON.stringify(location));
        }
      }
      setIsLoadingLocation(false);
    };

    loadUserLocation();
  }, []);

  // Calculate distances for meals with coordinates
  const mealsWithDistances = useMemo(() => {
    if (!userLocation) {
      return meals;
    }

    return meals.map((meal) => {
      // Only calculate if meal has coordinates
      if (meal.latitude !== undefined && meal.longitude !== undefined) {
        const distance = calculateDistanceMiles(userLocation, {
          latitude: meal.latitude,
          longitude: meal.longitude,
        });
        return {
          ...meal,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
        };
      }
      return meal;
    });
  }, [meals, userLocation]);

  return {
    mealsWithDistances,
    userLocation,
    isLoadingLocation,
  };
}
