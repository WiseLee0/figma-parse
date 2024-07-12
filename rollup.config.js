const typescript = require('@rollup/plugin-typescript');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const { cleandir } = require('rollup-plugin-cleandir');

module.exports = {
  input: ['./src/cli.ts'],
  output: {
    dir: './dist',
    format: 'cjs',
  },
  plugins: [
    cleandir('./dist'),
    typescript({
      module: 'esnext',
      exclude: ['./node_modules/**'],
    }),
    resolve.default({
      extensions: ['.js', '.ts'],
      modulesOnly: false,
      preferredBuiltins: true,
    }),
    commonjs({
      extensions: ['.js', '.ts']
    }),
  ],
};
