import type { NextConfig } from "next";
import tailwindExpandSWC from "@tailwind-expand/swc";
import { twMerge } from "tailwind-merge";

// SWC plugin only in production for HMR support in development
// In dev: PostCSS generates CSS classes (.Button { ... }) for instant updates
// In prod: SWC inlines classes (className="Button" → className="text-xs font-bold ...")
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    swcPlugins: isProd
      ? [
          tailwindExpandSWC({
            cssPath: "./app/globals.css",
            mergerFn: twMerge,
          }),
        ]
      : [],
  },
};

export default nextConfig;
