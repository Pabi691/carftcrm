/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Static export: `npm run build` writes plain HTML/CSS/JS to `out/`, which is
  // uploaded to the admin subdomain. Nothing server-side may be used — no API
  // routes, no getServerSideProps, and record ids travel as ?id=… query
  // strings rather than /orders/42 path segments.
  output: "export",
  // Each route becomes a folder with index.html, so Apache/LiteSpeed serves
  // /orders/view/ without any rewrite rules.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};
module.exports = nextConfig;
