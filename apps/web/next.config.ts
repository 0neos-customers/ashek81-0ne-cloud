import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@0ne/ui", "@0ne/db", "@0ne/auth"],
};

export default nextConfig;
