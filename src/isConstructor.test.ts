import { isConstructor } from "./isConstructor.ts";
import { describe, it } from "node:test";
import { strictEqual } from "node:assert";

describe("isConstructor", () => {
  it("should return true for a constructible function, but should not execute it", () => {
    let executed = false;
    function MyClass() {
      executed = true;
    }
    strictEqual(isConstructor(MyClass), true);
    strictEqual(executed, false);
  });

  it("should return false for an arrow function", () => {
    const myFunction = () => {};
    strictEqual(isConstructor(myFunction), false);
  });

  it("should return false for a non-function value", () => {
    strictEqual(isConstructor(42), false);
    strictEqual(isConstructor("string"), false);
    strictEqual(isConstructor({}), false);
    strictEqual(isConstructor([]), false);
  });
});
