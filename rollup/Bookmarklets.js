import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'untested/Bookmarklets/index.js',
  output: {
    file: 'docs/Bookmarklets/dependencies.js',
    format: 'es',
  },
  plugins: [nodeResolve()],
};