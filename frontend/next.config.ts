import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

const API_PATHS = [
  "/api/auth/login",
  "/api/auth/check-email",
  "/api/register",
  "/api/onboarding",
  "/api/food",
  "/api/metrics",
  "/api/chat",
  "/api/nutrition",
];

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@pk/core"],
  async rewrites() {
    return API_PATHS.map((source) => ({
      source: `${source}/:path*`,
      destination: `${BACKEND_URL}${source}/:path*`,
    }));
  },
};

export default nextConfig;