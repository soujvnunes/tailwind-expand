import type { NextConfig } from "next";
import tailwindExpandSWC from "@tailwind-expand/swc";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    swcPlugins: [tailwindExpandSWC({ cssPath: "./app/globals.css" })],
  },
};

export default nextConfig;
