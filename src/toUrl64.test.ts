import { describe, it, mock } from "node:test";
import assert from "node:assert";
import * as origToUrl64 from "./toUrl64.ts";

const KNOWN: [string | Uint8Array, string][] = [
  ["", ""],
  ["f", "Zg"],
  ["fo", "Zm8"],
  ["foo", "Zm9v"],
  ["foob", "Zm9vYg"],
  ["fooba", "Zm9vYmE"],
  ["foobar", "Zm9vYmFy"],
  [new Uint8Array([0xff, 0xff, 0xff]), "____"],
  [new Uint8Array([0xfb, 0xef, 0xbe]), "----"],
  [
    new Uint8Array([0x6b, 0x3f, 0x80, 0x67, 0xf6, 0xb3, 0xf8, 0x06]),
    "az-AZ_az-AY",
  ],
  ["r = √(¾𝔸÷π)", "ciA9IOKImijCvvCdlLjDt8-AKQ"],
];

const encoder = new TextEncoder();

// @ts-expect-error @types/node doesn't know about `toBase64`; this enables testing non-native cases
delete Uint8Array.prototype.toBase64;

describe("toUrl64", () => {
  for (const [input, expected] of KNOWN) {
    const rep =
      input instanceof Uint8Array
        ? `bytes(${[...input]
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ")})`
        : JSON.stringify(input);
    it(`encodes ${rep} as ${expected}`, async () => {
      const { toUrl64 } = await import("./toUrl64.ts");
      assert.strictEqual(toUrl64(input), expected);
    });
  }
  it("Throws if the input buffer is detached", async () => {
    const { toUrl64 } = await import("./toUrl64.ts");
    const input = new Uint8Array([0xff, 0xff, 0xff]);
    input.buffer.transfer();
    assert.throws(() => {
      toUrl64(input);
    });
  });

  // Other cases don't have `toBase64`
  it("calls `Uint8Array#toBase64` if it exists", async () => {
    const input = "input";
    const mToUrl64 = await import("./toUrl64.ts");
    const { mock: mocked } = ((Uint8Array.prototype as any).toBase64 = mock.fn(
      undefined,
      function () {
        return "output";
      }
    ));
    // Implementation not yet created
    assert.equal(mToUrl64._nativeToUrl64, undefined);
    mToUrl64.toUrl64(input);
    // Implementation created
    assert.notEqual(mToUrl64._nativeToUrl64, undefined);
    assert.deepStrictEqual(
      // Override .stack, since I can't copy that into a test
      { ...mocked.calls[0], stack: undefined },
      {
        this: encoder.encode(input),
        arguments: [{ alphabet: "base64url", omitPadding: true }],
        // Output is output of toBase64
        result: "output",
        stack: undefined,
        error: undefined,
        target: undefined,
      }
    );
  });
});
