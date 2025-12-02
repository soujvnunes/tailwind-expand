import type { NextConfig } from "next";
import tailwindExpandSWC from "@tailwind-expand/swc";
import { twMerge } from "tailwind-merge";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    swcPlugins: [
      tailwindExpandSWC({
        cssPath: "./app/globals.css",
        mergerFn: twMerge,
      }),
    ],
  },
};

export default nextConfig;
