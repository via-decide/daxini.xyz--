import security from "eslint-plugin-security";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  js.configs.recommended,
  security.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.serviceworker,
        d3: "readonly",
        NDEFReader: "readonly",
        ZayvoraThreadStore: "readonly",
        ZayvoraThreadManager: "readonly",
        ZayvoraLiveTimeline: "readonly",
        GlobalMemoryGraphClient: "readonly"
      }
    },
    rules: {
      "security/detect-object-injection": "warn",
      "security/detect-unsafe-regex": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-unused-vars": ["error", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_"
      }],
      "no-var": "error",
      "prefer-const": "error",
      "eqeqeq": ["error", "always"],
      "curly": "error"
    }
  },
  {
    files: ["zayvora/code-analysis/*.js", "security/promptGuard.js"],
    rules: {
      "security/detect-unsafe-regex": "warn"
    }
  }
];
