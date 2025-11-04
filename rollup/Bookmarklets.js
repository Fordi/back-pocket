import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import css from "rollup-plugin-import-css";

export default {
  input: 'untested/Bookmarklets/index.js',
  output: {
    file: 'docs/Bookmarklets/dependencies.js',
    format: 'es',
    inlineDynamicImports: true,
  },
  treeshake: true,
  plugins: [
    commonjs(),
    nodeResolve({
      browser: true,
    }),
    css(),
  ],
};