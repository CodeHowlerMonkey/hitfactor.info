const a11yOff = Object.keys(require("eslint-plugin-jsx-a11y").rules).reduce(
  (acc, rule) => {
    acc[`jsx-a11y/${rule}`] = "off";
    return acc;
  },
  {},
);
module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs"],
  settings: { react: { version: "18.2" } },
  plugins: ["react-refresh", "prefer-arrow", "import"],
  rules: {
    "arrow-parens": ["error", "as-needed"],
    "no-console": ["error", { allow: ["error"] }],
    "no-empty": ["error", {allowEmptyCatch: true}],
    "@typescript-eslint/no-unused-vars": ["error",{ caughtErrors: "none"}],
    "no-use-before-define": "off",

    // constants / variables
    "prefer-const": "error",
    "no-var": "error",
    "no-unused-vars": "off",
    "one-var": ["error", "never"],

    // generic javascript
    curly: ["error", "all"],
    eqeqeq: "error",
    "no-unsafe-optional-chaining": "error",
    "no-useless-return": "error",
    "no-useless-call": "error",
    "no-useless-escape": "error",
    "no-useless-computed-key": "error",
    "no-else-return": "error",
    "no-return-assign": "error",
    "no-restricted-globals": "error",
    "no-shadow": "off", // must be turned off for ts enum not to conflict
    "@typescript-eslint/no-shadow": "error",
    "no-param-reassign": "error",
    "no-return-await": "error",
    "dot-notation": "error",
    "no-eq-null": "error",

    // imports
    "import/order": [
      "error",
      {
        groups: ["builtin", "external", "internal", "sibling", "parent", "index"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "import/prefer-default-export": "off",
    "import/extensions": "off",
    "import/no-unresolved": "off",

    // codestyle - strings
    "no-useless-concat": "error",
    "prefer-template": "error",

    // functions
    "arrow-body-style": ["error", "as-needed"],
    "prefer-arrow/prefer-arrow-functions": [
      "error",
      {
        disallowPrototype: true,
        singleReturnOnly: false,
        classPropertiesAllowed: false,
      },
    ],
    "prefer-arrow-callback": ["error"],
    "func-style": ["error", "expression", { allowArrowFunctions: true }],
    "react/function-component-definition": [
      "error",
      {
        namedComponents: "arrow-function",
        unnamedComponents: "arrow-function",
      },
    ],

    // casing
    camelcase: "off",
    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: "typeLike",
        format: ["PascalCase"],
      },
    ],

    "react/no-children-prop": "error",
    "react/self-closing-comp": "error",
    "react/jsx-curly-brace-presence": "error",
    "react/destructuring-assignment": "error",
    "react/jsx-no-duplicate-props": "error",
    "react/jsx-props-no-spreading": "off",
    "react/jsx-boolean-value": "error",
    "react/jsx-no-useless-fragment": ["error", { allowExpressions: true }],
    "react-hooks/exhaustive-deps": "error",

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
    "prettier/prettier": [
      "error",
      {
        printWidth: 90,
        tabWidth: 2,
        useTabs: false,
        arrowParens: "avoid",
      },
    ],
  },
};
