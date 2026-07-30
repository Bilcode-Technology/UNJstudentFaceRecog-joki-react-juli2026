import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'localhost:3000',
    '127.0.0.1:3000',
    '192.168.1.7:3000',
    '192.168.1.7',
    '*.ngrok-free.app',
    '*.ngrok.io',
    '*.loca.lt'
  ],
};

export default nextConfig;
