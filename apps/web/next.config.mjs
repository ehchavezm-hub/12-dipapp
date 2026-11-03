// Next.js 14.2 only loads next.config.js / next.config.mjs (TypeScript config
// files are supported from Next 15), so this file must stay .mjs.

/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@dipapp/types"],
}

export default nextConfig
