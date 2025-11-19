import { strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
// @ts-expect-error test are run by native runner
import { escapeRegExp, restoreLead } from "./escapeRegExp.ts";

describe("escapeRegExp", () => {
  it("Escapes basic well-known codes", () => {
    strictEqual(escapeRegExp("\t"), "\\t");
    strictEqual(escapeRegExp("\r"), "\\r");
    strictEqual(escapeRegExp("\n"), "\\n");
    strictEqual(escapeRegExp("\u000b"), "\\v");
    strictEqual(escapeRegExp("\f"), "\\f");
  });
  it("Escapes punctuative symbols", () => {
    strictEqual(escapeRegExp('/'), '\\/');
    strictEqual(escapeRegExp('\\'), '\\\\');
    strictEqual(escapeRegExp('^$\\.*+?()[]{}|'),'\\^\\$\\\\\\.\\*\\+\\?\\(\\)\\[\\]\\{\\}\\|');
  });
  it("Escapes basic text and unicode", () => {
    strictEqual(escapeRegExp('The Quick Brown Fox'),'\\x54he\\x20Quick\\x20Brown\\x20Fox');
    strictEqual(escapeRegExp('hello there'),'\\x68ello\\x20there');
    strictEqual(escapeRegExp(''),'');
    strictEqual(escapeRegExp('hi. how are you? 💩'),'\\x68i\\.\\x20how\\x20are\\x20you\\?\\x20💩');
    strictEqual(escapeRegExp('123 Fake St.'),'\\x3123\\x20Fake\\x20St\\.');
  });
  it("Escapes UTF-16 surrogates", () => {
    strictEqual(escapeRegExp('\uD834_\uDF06.'), '\\ud834_\\udf06\\.');
  });
  it("Throws if given a non-string", () => {
    // @ts-expect-error Intentional
    throws(() => escapeRegExp(5));
    // @ts-expect-error Intentional
    throws(() => escapeRegExp(true));
    // @ts-expect-error Intentional
    throws(() => escapeRegExp([]));
    // @ts-expect-error Intentional
    throws(() => escapeRegExp({}));
    throws(() => escapeRegExp(null));
    throws(() => escapeRegExp(undefined));
    // @ts-expect-error Intentional
    throws(() => escapeRegExp(new RegExp('')));
  });
});

describe("restoreLead", () => {
  it("Restores replaced alphanumerics at the lead of rx-escaped strings", () => {
    strictEqual(restoreLead(`Well, ${escapeRegExp('hello there')}`),'Well, hello\\x20there');
  });
  it("Does not restore replaced alphanumerics at the lead of rx-escaped strings when first character or preceded by \\0 or \\c", () => {
    strictEqual('\\0\\x68ello\\x20there', restoreLead(`\\0${escapeRegExp('hello there')}`));
    strictEqual('\\c\\x68ello\\x20there', restoreLead(`\\c${escapeRegExp('hello there')}`));
    strictEqual('\\x68ello\\x20there', restoreLead(escapeRegExp('hello there')));
  });
});