import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  // 允许局域网 IP 访问 dev 资源，否则跨源请求 /_next/* 会被拦截
  // 导致页面 JS 未能水合，主题切换等交互“点了没反应”
  allowedDevOrigins: ['192.168.0.221'],
  experimental: {
    agentFeedback: true,
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig
