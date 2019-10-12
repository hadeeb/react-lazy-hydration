module.exports = {
  root: true,
  extends: [
    "react-app",
    "plugin:prettier/recommended"
  ],
  plugins: ["simple-import-sort"],
  rules: {
    "no-unused-vars": "error",
    "simple-import-sort/sort": "error"
  }
};
