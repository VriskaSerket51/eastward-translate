import js from "@eslint/js";
import hooks from "eslint-plugin-react-hooks";
import { createRequire } from "node:module";

// Keep the linter on the compiler API it supports.
const require = createRequire(new URL("./tools/eslint/package.json", import.meta.url));
const tseslint = require("typescript-eslint");

export default tseslint.config(
  { ignores: ["dist/**", "server-dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        fetch: "readonly",
        URL: "readonly",
        AbortController: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
    plugins: { "react-hooks": hooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);
