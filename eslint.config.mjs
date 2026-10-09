// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/coverage/**",
      "**/dist/**",
      "**/generated/**",
      "**/node_modules/**",
      "**/storybook-static/**",
      "**/.turbo/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // Prettier owns formatting; this only switches off conflicting ESLint rules.
  eslintConfigPrettier,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
