import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 确保 Bun 的内置模块不被 Next.js 处理
  transpilePackages: [],
  webpack: (config, { isServer }) => {
    // 告诉 webpack 忽略 bun: 前缀的模块
    if (isServer) {
      config.externals = [...config.externals, 'bun:sqlite'];
    }
    return config;
  },
  /* config options here */
};

export default nextConfig;
