const a11yOff = Object.keys(require("eslint-plugin-jsx-a11y").rules).reduce(
  (acc, rule) => {
    acc[`jsx-a11y/${rule}`] = "off";
    return acc;
  },
  {},
);
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "airbnb",
    "plugin:prettier/recommended",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs"],
  //extensions: ['.js', 'jsx', '.ts', '.tsx'],
  settings: { react: { version: "18.2" } },
  plugins: ["react-refresh"],
  rules: {
    "import/order": [
      "error",
      {
        groups: ["builtin", "external", "parent", "sibling", "index"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "import/prefer-default-export": 0,
    "import/extensions": 0,

    "no-console": ["error", { allow: ["warn", "error"] }],

    // support oneline async functions like delay() without {}
    "no-promise-executor-return": 0,

    // we need private non-class things
    "no-underscore-dangle": 0,

    "react/jsx-props-no-spreading": 0,
    "react/prop-types": 0,
    "react/display-name": 0,
    "react/no-unstable-nested-components": 0,
    "react/react-in-jsx-scope": 0,
    "react/jsx-filename-extension": [1, { extensions: [".jsx", ".tsx"] }],
    "react/function-component-definition": [
      1,
      {
        namedComponents: "arrow-function",
        unnamedComponents: "arrow-function",
      },
    ],
    "react/no-unescaped-entities": 0,

    // TODO: revert and fix these later
    "react-refresh/only-export-components": 0,
    ...a11yOff,
  },
};
