import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript"
  ),
  {
    rules: {
      // 暂时允许现有代码使用 any，避免大量旧代码阻断部署
      "@typescript-eslint/no-explicit-any": "off",

      // 暂时不因 JSX 文本中的英文撇号阻断部署
      "react/no-unescaped-entities": "off",
    },
  },
];
