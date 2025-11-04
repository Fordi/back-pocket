export * as hljs from 'highlight.js';
export { minify } from 'terser';
export { default as monacoLoader } from "@monaco-editor/loader";
import * as prettier from 'prettier';
import * as prettierPluginBabel from "prettier/plugins/babel.mjs";
import * as prettierPluginEstree from "prettier/plugins/estree.mjs";

export function format(code, options) {
  return prettier.format(code, {
    ...options,
    parser: 'babel',
    plugins: [...(options?.plugins ?? []), prettierPluginBabel, prettierPluginEstree],
  })
}