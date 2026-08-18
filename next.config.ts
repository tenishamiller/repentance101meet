import type { NextConfig } from "next";

function buildRemotePatterns() {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      patterns.push({
        protocol: "https",
        hostname: new URL(supabaseUrl).hostname,
        pathname: "/storage/v1/object/public/**",
      });
    } catch {
      /* ignore invalid URL */
    }
  }

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

  // Legacy preview hosts (safe to keep while cutting over off Vercel).
  patterns.push({
    protocol: "https",
    hostname: "**.vercel.app",
    pathname: "/uploads/**",
  });

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: buildRemotePatterns(),
  },
};

export default nextConfig;
