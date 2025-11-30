import type { NextConfig } from "next";
import tailwindExpandSWC from "@tailwind-expand/swc";
import { twMerge } from "tailwind-merge";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    swcPlugins: [
      tailwindExpandSWC({
        cssPath: "./app/globals.css",
        // Merge conflicting utilities (e.g., py-2 + py-4 → py-4)
        mergerFn: twMerge,
      }),
    ],
  },
};

export default nextConfig;
