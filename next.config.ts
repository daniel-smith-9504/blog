import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  devIndicators: false,

  typescript: {
    ignoreBuildErrors: true,
  },

  async rewrites() {
    return [
      {
        source: "/admin",
        destination: "/admin/index.html",
      },
      {
        source: "/admin/",
        destination: "/admin/index.html",
      },
      {
        source: "/admin/:path((?!static|index\\.html).*)",
        destination: "/admin/index.html",
      },
    ];
  },
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "lucide-react",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
