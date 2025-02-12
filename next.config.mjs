/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "export",
    //Remove basePath when you are trying to deploy other than github page
    basePath: "/face_shape_detection",
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
