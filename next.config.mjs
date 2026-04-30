/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/proxy/:path*',
        destination: 'https://ai.hackclub.com/proxy/v1/:path*'
      }
    ];
  }
};

export default nextConfig;
