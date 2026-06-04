import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Avatares públicos do Supabase Storage
      { protocol: "https", hostname: "eddzzyhpiozpfbplmixl.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
