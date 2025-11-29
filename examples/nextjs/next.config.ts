import type { NextConfig } from "next";
import { swc } from "@tailwind-expand/swc";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    swcPlugins: [swc({ cssPath: "./app/globals.css" })],
  },
};

export default nextConfig;
