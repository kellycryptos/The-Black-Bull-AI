import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kill static generation workers that stall (e.g. due to force-dynamic API routes
  // being collected). All routes use force-dynamic so timeout just acts as a safety net.
  // Prevents OOM crashes on Vercel's build machines.
  staticPageGenerationTimeout: 10,
};

export default nextConfig;
