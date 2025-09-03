import { ExtensibleFunction } from "./ExtensibleFunction.ts";
import { describe, it } from "node:test";
import { strictEqual, throws } from "node:assert";

describe.only("ExtensibleFunction", () => {
  it("should look and act like a function", () => {
    class Fixture extends ExtensibleFunction<number, number> {
      invoke(x: number) {
        return x * 2;
      }
    }
    const fn = new Fixture();
    strictEqual(typeof fn, "function");
    strictEqual(fn(2), 4);
  });
  it("should throw an error if invoke is not implemented", () => {
    class Fixture extends ExtensibleFunction<void, void> {}
    throws(() => {
      const fn = new Fixture();
    });
  });
});