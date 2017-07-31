// http://eslint.org/docs/user-guide/configuring
module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module',
  },
  env: {
    browser: true,
  },
  extends: 'airbnb-base',

  // 自訂規則
  rules: {
    // import 的時候不用寫 .js 跟 .vue
    'import/extensions': [ 'error', 'always', {
      js: 'never',
    }],
    'no-param-reassign': ['error', { props: false }],
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
  },
};