export const mockMeals = [
  {
    id: '1',
    name: 'Grilled Chicken Power Bowl',
    restaurant: 'Sweetgreen',
    restaurant_name: 'Sweetgreen', // Add restaurant_name for compatibility
    rating: 4.7,
    calories: 485,
    protein: 42,
    carbs: 38,
    fats: 16,
    ingredients: ['Grilled Chicken', 'Quinoa', 'Kale', 'Avocado'],
    image: null, // Set to null to use restaurant logo fallback
    image_url: null, // Also set image_url to null for compatibility
    aiSwaps: ['Remove avocado to save calories']
  }
];