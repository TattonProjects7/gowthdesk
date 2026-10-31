import path from "node:path";
import type { NextConfig } from "next";

// Shortlist lives in shortlist/ inside the GrowthDesk repository. Pin the
// project root here so Next doesn't adopt the repository root (and its
// lockfile) as the workspace.
const root = path.resolve(__dirname);

const nextConfig: NextConfig = {
  outputFileTracingRoot: root,
  turbopack: { root },
};
export default nextConfig;
