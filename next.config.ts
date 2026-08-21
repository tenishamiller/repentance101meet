import type { NextConfig } from "next";

function buildRemotePatterns() {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

  patterns.push({
    protocol: "https",
    hostname: "repentance101ministry.com",
    pathname: "/uploads/**",
  });

  patterns.push({
    protocol: "https",
    hostname: "repentance101ministry.com",
    pathname: "/media/**",
  });

  patterns.push({
    protocol: "https",
    hostname: "www.repentance101ministry.com",
    pathname: "/media/**",
  });

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: buildRemotePatterns(),
  },
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
