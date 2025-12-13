import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com", // Unsplash often uses this subdomain too
      },
      {
        protocol: "https",
        hostname: "source.unsplash.com", // Unsplash Source API
      },
      {
        protocol: "https",
        hostname: "placehold.co", // For your fallback placeholders
      },
      {
        protocol: "https",
        hostname: "foodish-api.herokuapp.com", // Foodish API for food images
      },
    ],
  },
};

export default nextConfig;