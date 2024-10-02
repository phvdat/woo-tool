/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    isServer && (config.externals = [...config.externals, 'socket.io-client']);
    return config;
  },
};

export default nextConfig;
