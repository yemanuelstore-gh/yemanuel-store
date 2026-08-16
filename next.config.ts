import type { NextConfig } from "next";
import { remoteImagePatterns } from "./src/lib/image-config";

const nextConfig: NextConfig = {
  images: { remotePatterns: remoteImagePatterns },
};

export default nextConfig;