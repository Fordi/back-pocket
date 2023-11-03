import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/Bookmarklets/index.js',
  output: {
    file: 'docs/build/Bookmarklets.js',
    format: 'es',
  },
  plugins: [nodeResolve()],
};