import babel from "rollup-plugin-babel";
import nodeResolve from "rollup-plugin-node-resolve";
import replace from "rollup-plugin-replace";

import pkg from "./package.json";

const extensions = [".tsx", ".ts", ".js"];

const external = [
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.dependencies || {})
];

const loose = true;

const createBabelConfig = isESM => {
  return {
    presets: [
      ["@babel/preset-typescript", { loose, modules: false }],
      ["@babel/preset-env", { loose, modules: false }]
    ],
    plugins: [
      "babel-plugin-macros",
      ["@babel/plugin-transform-runtime", { useESModules: isESM }],
      "@babel/plugin-transform-react-jsx"
    ]
  };
};

const createExternalPredicate = externalArr => {
  if (externalArr.length === 0) {
    return () => false;
  }
  const pattern = new RegExp(`^(${externalArr.join("|")})($|/)`);
  return id => pattern.test(id);
};

const createConfig = ({ output, browser = false, isESM = false }) => ({
  input: "src/index.tsx",
  output: output.map(format => ({ exports: "named", ...format })),
  external: createExternalPredicate(external),
  plugins: [
    nodeResolve({ extensions }),
    babel({ extensions, runtimeHelpers: true, ...createBabelConfig(isESM) }),
    replace({
      "process.env.BROWSER": JSON.stringify(browser)
    })
  ]
});

export default [
  createConfig({
    output: [{ file: pkg.main, format: "cjs" }]
  }),
  createConfig({
    output: [{ file: pkg.module, format: "esm" }],
    isESM: true
  }),
  createConfig({
    output: [{ file: pkg.browser[pkg.main], format: "cjs" }],
    browser: true
  }),
  createConfig({
    output: [{ file: pkg.browser[pkg.module], format: "esm" }],
    browser: true,
    isESM: true
  })
];
