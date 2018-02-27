module.exports = {
  "parser": "babel-eslint",
  "extends": [
    "standard",
    "plugin:react/recommended"
  ],
  "rules": {
    "no-debugger": [0],
    "react/jsx-uses-vars": [2],
    "react/prop-types":[0],
    "camelcase":[0],
    "no-multiple-empty-lines": ["error", { "max": 2, "maxEOF": 1 }]
  }
}
