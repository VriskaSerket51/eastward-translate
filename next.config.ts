import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import { resolve } from "node:path";

// Include the sibling source library used by the file: dependency.
const workspaceRoot = resolve(process.cwd(), "..");
const config: NextConfig = {
  serverExternalPackages: [
    "eastward.js",
    "@prisma/adapter-better-sqlite3",
    "better-sqlite3",
  ],
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
};
export default createNextIntlPlugin()(config);
