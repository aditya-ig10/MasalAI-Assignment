/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production builds write to .next-build so `npm run build` never
  // disturbs the running dev server (which owns .next).
  distDir: process.env.NEXT_BUILD_DIR ?? ".next",
};
export default nextConfig;
