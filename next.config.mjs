/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    experimental: {
        serverActions: {
            bodySizeLimit: "10mb",
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "zwizai.s3.amazonaws.com",
            },
            {
                protocol: "https",
                hostname: "graph.facebook.com",
            },
        ],
    },
};

export default nextConfig;
