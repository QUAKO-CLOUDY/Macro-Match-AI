import { Meal } from '../types';

export const mockMeals: Meal[] = [
  {
    id: "1",
    name: "Grilled Salmon Bowl",
    restaurant: "Fresh Kitchen",
    calories: 550,
    protein: 45,
    carbs: 30,
    fats: 20,
    price: 18,
    prepTime: 15,
    category: 'restaurant',
    image: null as any, // Set to null to use restaurant logo fallback
    description: "Fresh Atlantic salmon with quinoa.",
    ingredients: ["Salmon", "Quinoa", "Kale"],
    // Add restaurant_name for compatibility with Supabase data structure
    restaurant_name: "Fresh Kitchen",
    // Coordinates will be calculated dynamically from user location
    // Placeholder coordinates - replace with actual restaurant coordinates
    latitude: 28.5383,
    longitude: -81.3792,
  },
  {
    id: "2",
    name: "Keto Burger (No Bun)",
    restaurant: "Burger Joint",
    calories: 620,
    protein: 38,
    carbs: 8,
    fats: 45,
    price: 14,
    prepTime: 10,
    category: 'restaurant',
    image: null as any, // Set to null to use restaurant logo fallback
    description: "Double patty burger wrapped in lettuce.",
    // Add restaurant_name for compatibility with Supabase data structure
    restaurant_name: "Burger Joint",
    // Coordinates will be calculated dynamically from user location
    // Placeholder coordinates - replace with actual restaurant coordinates
    // Distance should be ~3.3 miles when calculated from user location
    latitude: 28.5443,
    longitude: -81.3792,
  },
  {
    id: "3",
    name: "Vegan Power Salad",
    restaurant: "Green Eats",
    calories: 420,
    protein: 18,
    carbs: 45,
    fats: 15,
    price: 12,
    prepTime: 5,
    category: 'restaurant',
    image: null as any, // Set to null to use restaurant logo fallback
    description: "Kale, chickpeas, and tahini dressing.",
    // Add restaurant_name for compatibility with Supabase data structure
    restaurant_name: "Green Eats",
    // Coordinates will be calculated dynamically from user location
    // Placeholder coordinates - replace with actual restaurant coordinates
    latitude: 28.5323,
    longitude: -81.3892,
  }
];