import type { NextConfig } from "next";

// Don't set outputFileTracingRoot or turbopack.root here. Shortlist lives in
// shortlist/ inside the GrowthDesk repository, and Vercel builds it with the
// repository root as the tracing root (NEXT_PRIVATE_OUTPUT_TRACE_ROOT). Pinning
// it to this folder makes Vercel's build adapter record every output file at
// the wrong path, and the deployment fails at "Deploying outputs".
const nextConfig: NextConfig = {};
export default nextConfig;
