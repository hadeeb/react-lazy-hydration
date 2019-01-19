const { BABEL_ENV } = process.env;
const cjs = BABEL_ENV === "commonjs";
module.exports = {
  presets: [
    ["@babel/preset-typescript", { loose: true, modules: false }],
    ["@babel/env", { loose: true, modules: false }]
  ],
  plugins: [
    ["@babel/transform-runtime", { useESModules: !cjs }],
    ["@babel/plugin-proposal-class-properties", { loose: true }],
    cjs && ["@babel/transform-modules-commonjs", { loose: true }]
  ].filter(Boolean)
};
