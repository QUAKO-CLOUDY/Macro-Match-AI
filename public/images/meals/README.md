# Meal Images Directory

This directory contains static meal images used as fallbacks when real images aren't available.

## How to Add Images

1. Add your image files to this directory (e.g., `grilled-chicken-bowl.jpg`)
2. Update the `getLocalMealImage` function in `lib/image-utils.ts` to map meal names to your new image

## Recommended Image Specifications

- **Format**: JPG or PNG
- **Dimensions**: 600x400px (or 3:2 aspect ratio)
- **File Size**: Keep under 200KB for fast loading
- **Naming**: Use kebab-case (e.g., `grilled-chicken-bowl.jpg`)

## Example Images to Add

- `grilled-chicken-bowl.jpg` - For chicken-based bowls
- `salmon-bowl.jpg` - For salmon dishes
- `beef-bowl.jpg` - For beef dishes
- `veggie-bowl.jpg` - For vegetarian/vegan bowls
- `salad-bowl.jpg` - For salad dishes
- `burrito.jpg` - For burritos
- `tacos.jpg` - For tacos
- `mediterranean-bowl.jpg` - For Mediterranean dishes
- `default-bowl.jpg` - Generic healthy bowl fallback
- `default-mexican.jpg` - Generic Mexican food fallback
- `default-mediterranean.jpg` - Generic Mediterranean fallback
- `default-salad.jpg` - Generic salad fallback

## Image Sources

You can use:
- Unsplash (https://unsplash.com) - Free stock photos
- Pexels (https://pexels.com) - Free stock photos
- Your own photos
- Restaurant menu photos (with permission)
