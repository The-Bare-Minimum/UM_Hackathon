import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // reactCompiler is disabled — it causes extreme memory usage during dev,
  // leading to OOM crashes when multiple routes compile simultaneously.
  // reactCompiler: true,
};

export default nextConfig;
