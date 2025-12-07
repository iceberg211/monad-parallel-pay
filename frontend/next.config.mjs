import path from "path";
import { codeInspectorPlugin } from "code-inspector-plugin";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "."),
      // Fix for @metamask/sdk trying to import react-native-async-storage
      "@react-native-async-storage/async-storage": false,
    };
    config.plugins.push(codeInspectorPlugin({ bundler: "webpack" }));
    return config;
  },
};

export default nextConfig;
