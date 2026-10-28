import type { NextConfig } from "next";

// Cache Components is intentionally left off: every read here (slots, bookings)
// must reflect live database state, so we keep Next's default dynamic behaviour.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
