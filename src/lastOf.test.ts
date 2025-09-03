
import { describe, it } from "node:test";
import { strictEqual, throws } from "node:assert";
import { lastOf } from "./lastOf.ts";


describe("lastOf", () => {
  it("should return the last element of an array", () => {
    strictEqual(lastOf([1, 2, 3]), 3);
  });

  it("should return undefined for an empty array", () => {
    strictEqual(lastOf([]), undefined);
  });

  it("should return the last element of an iterable", () => {
    function* gen() {
      for (let i = 0; i < 10; i++) {
        yield i;
      }
    }
    strictEqual(lastOf(gen()), 9);
  });

  it("should return a promise resolving to the last element of an async iterable", async () => {
    async function* gen() {
      for (let i = 0; i < 10; i++) {
        yield i;
      }
    }
    strictEqual(await lastOf(gen()), 9);
  });

  it("should return a promise if the input is a promise", async () => {
    strictEqual(await lastOf(Promise.resolve([1, 2, 3])), 3);
  });

  it("should throw for invalid inputs", () => {
    // @ts-expect-error Testing invalid input
    throws(() => lastOf(null));
    // @ts-expect-error Testing invalid input
    throws(() => lastOf(0));
  });
});