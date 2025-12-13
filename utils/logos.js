export const getLogo = (restaurantName) => {
    // Safety check: If name is missing, return a default icon
    if (!restaurantName) return '/logos/default.png'; 
  
    const slug = restaurantName
      .toLowerCase()         // "Taco Bell" -> "taco bell"
      .trim()                // Remove extra spaces
      .replace(/'/g, '')     // Remove apostrophes: "Wendy's" -> "wendys"
      .replace(/\s+/g, '_'); // Replace spaces with underscores: "taco bell" -> "taco_bell"
  
    // Return the path to the public folder
    return `/logos/${slug}.png`;
  };