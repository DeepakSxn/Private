/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push(/^pdf-parse$/); // exclude pdf-parse from server bundle
    }
    return config;
  },
};

export default nextConfig;
