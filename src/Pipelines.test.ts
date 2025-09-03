import { deepStrictEqual, rejects, strictEqual, throws } from "node:assert";
import { toAsyncIterable, concurrently, allOf, lastOf } from "./Pipelines.ts";
import { describe, it } from "node:test";

describe.only("Pipeline helpers", () => {
  describe("toAsyncIterable", () => {
    it("should yield items from a sync iterable", async () => {
      const arr = [1, 2, 3];
      const result: number[] = [];
      for await (const item of toAsyncIterable(arr)) {
        result.push(item);
      }
      deepStrictEqual(result, [1, 2, 3]);
    });

    it("should yield items from an async iterable", async () => {
      async function* gen() {
        yield 1;
        yield 2;
        yield 3;
      }
      const result: number[] = [];

      for await (const item of toAsyncIterable(gen())) {
        result.push(item);
      }
      deepStrictEqual(result, [1, 2, 3]);
    });

    it("should throw on non-iterable input", async () => {
      await rejects(async () => toAsyncIterable(null as any));
    });
    
  });

  describe("concurrently", () => {
    it("should process items concurrently with correct results", async () => {
      const arr = [1, 2, 3, 4];
      const makePromise = (item: number) =>
        new Promise<number>((resolve) => {
          setTimeout(() => {
            resolve(item * 2);
          }, 10 * item);
        });
      const results: number[] = [];
      for await (const result of concurrently(2, arr, makePromise)) {
        results.push(result);
      }
      deepStrictEqual(results, [2, 4, 6, 8]);
    });

    it("should work with async iterable input", async () => {
      async function* gen() {
        yield 1;
        yield 2;
      }
      const makePromise = async (item: number) => item + 1;
      const results: number[] = [];
      for await (const result of concurrently(1, gen(), makePromise)) {
        results.push(result);
      }
      deepStrictEqual(results, [2, 3]);
    });

    it("should have a `flush` method that returns a promise that will resolve, even after the iterator is consumed", async () => {
      const arr = [1, 2];
      const makePromise = async (item: number) => item * 3;
      const iter = concurrently(1, arr, makePromise);
      const allResults: number[] = [];
      for await (const result of iter) {
        allResults.push(result);
      }
      deepStrictEqual(await iter.flush(), [3, 6]);
    });

    it("should have a `flush` method that returns a promise that will resolve, even before the iterator is consumed, thereby consuming the iterator", async () => {
      const arr = [1, 2];
      const makePromise = async (item: number) => item * 3;
      const iter = concurrently(1, arr, makePromise);
      deepStrictEqual(await iter.flush(), [3, 6]);
    });
    it("should throw an error if a promise rejects on final flush", async () => {
      const arr = [1, 2, 3];
      const makePromise = async (item: number) => {
        if (item > 2) {
          throw new Error(">2 not allowed");
        }
        return item * 2;
      };
      const iter = concurrently(2, arr, makePromise);
      await rejects(async () => {
        await iter.flush();
      });
    });
    it("should throw an error if a promise rejects on drain", async () => {
      const arr = [1, 2, 3];
      const makePromise = async (item: number) => {
        if (item === 1) {
          throw new Error(">2 allowed");
        }
        return item * 2;
      };
      const iter = concurrently(1, arr, makePromise);
      await rejects(async () => {
        await iter.flush();
      });
    });
    it("should throw an error on the iterable if the promise-maker throws", async () => {
      const arr = [1, 2];
      const makePromise = (item: number) => {
        if (item === 2) {
          throw new Error("No 2's allowed");
        }
        return item * 2;
      };
      const iter = concurrently(1, arr, makePromise);
      await rejects(async () => {
        for await (const item of iter);
      });
      await iter.flush().catch(() => {});
    });
  });

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
      const result = lastOf(Promise.resolve([1, 2, 3]));
      strictEqual(result.then, Promise.prototype.then);
    });

    it("should throw for invalid inputs", () => {
      // @ts-expect-error Testing invalid input
      throws(() => lastOf(null));
      // @ts-expect-error Testing invalid input
      throws(() => lastOf(0));
    });
  });

  describe("allOf", () => {
    it("returns array for sync iterable", () => {
      const arr = [1, 2, 3];
      deepStrictEqual(allOf(arr), [1, 2, 3]);
      deepStrictEqual(allOf(new Set([4, 5])), [4, 5]);
    });

    it("returns Promise<array> for async iterable", async () => {
      async function* gen() {
        yield 1;
        yield 2;
        yield 3;
      }
      deepStrictEqual(await allOf(gen()), [1, 2, 3]);
    });

    it("returns Promise<array> for promise of iterable", async () => {
      const promise = Promise.resolve([7, 8, 9]);
      deepStrictEqual(await allOf(promise), [7, 8, 9]);
    });

    it("returns Promise<array> for promise of async iterable", async () => {
      async function* gen() {
        yield "a";
        yield "b";
      }
      const promise = Promise.resolve(gen());
      deepStrictEqual(await allOf(promise), ["a", "b"]);
    });

    it("throws for non-iterable", () => {
      throws(() => allOf(123 as any));
      throws(() => allOf(null as any));
      throws(() => allOf(undefined as any));
    });
  });
});
