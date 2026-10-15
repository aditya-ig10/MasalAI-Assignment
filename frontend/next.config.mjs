/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production builds write to .next-build so `npm run build` never
  // disturbs the running dev server (which owns .next).
  distDir: process.env.NEXT_BUILD_DIR ?? ".next",
  // Single-service deploys (Render): the FastAPI backend listens on an
  // internal port and the browser reaches it through this prefix.
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8000";
    return [{ source: "/live/:path*", destination: `${backend}/:path*` }];
  },
};
export default nextConfig;
