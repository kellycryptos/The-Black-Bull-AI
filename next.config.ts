import type { NextConfig } from "next";

const nextConfig = {
  // Kill static generation workers that stall (e.g. due to force-dynamic API routes
  // being collected). All routes use force-dynamic so timeout just acts as a safety net.
  // Prevents OOM crashes on Vercel's build machines.
  staticPageGenerationTimeout: 10,

  experimental: {
    // Limit Next.js to 1 CPU core to prevent spawning multiple parallel build workers
    // which causes Vercel OOM crashes on resource-constrained containers.
    cpus: 1,
    // Fall back to child_process instead of spawning multiple worker threads
    workerThreads: false,
  },
} as any;

export default nextConfig;
