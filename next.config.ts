import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    API_URL: process.env.API_URL ?? "http://localhost:8080",
    // Mesma origem que API_URL, mas com nome padronizado com os outros dois
    // apps — necessária pro WebSocket do chat conectar direto no backend
    // (SockJS não passa pelas rotas de proxy same-origin do Next).
    NEXT_PUBLIC_API_URL: process.env.API_URL ?? "http://localhost:8080",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  },
};

export default nextConfig;
