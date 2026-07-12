import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // web/ imports the engine from ../src (see lib/engine.ts); trace from the repo
  // root so deploys with rootDirectory=web include those files.
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
