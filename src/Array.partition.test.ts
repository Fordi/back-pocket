import { describe, it } from "node:test";
import assert from "node:assert";
import { DEFAULT, partition } from "./Array.partition.ts";

describe("Array partition", () => {
  it("Splits an array into a pair given a filtering function", () => {
    const items = [0, 1, 2, 3, 4, 5, 6, 7];
    // Sub in undefined an null for nominally false values, to see that
    // they're treated the same as false.  Do this as odd to test "first is null/undefined" condition
    const isOdd = (n: number): boolean | undefined | null =>
      n === 0 ? undefined : n === 2 ? null : n % 2 === 1;
    const result = partition(items, isOdd);
    assert.deepStrictEqual(result, [
      [1, 3, 5, 7],
      [0, 2, 4, 6],
    ]);
  });

  it("Splits an array into a pair [[], [...array]] if filtering function only returns undefined/null values", () => {
    const items = [0, 1, 2, 3, 4, 5, 6, 7];
    // Sub in undefined an null for nominally false values, to see that
    // they're treated the same as false.  Do this as `0` to test "first is falsy but not false" condition
    const isOdd = (n: number): boolean | undefined | null =>
      n % 2 === 1 ? undefined : null;
    const result = partition(items, isOdd);
    assert.deepStrictEqual(result, [[], [0, 1, 2, 3, 4, 5, 6, 7]]);
  });

  it("Splits an array into slots given a numeric partitioning function", () => {
    const items = [0, 1, 2, 3, 4, 5, 6, 7];
    const threePer = (_: any, i: number) => (i === 0 ? undefined : Math.floor(i / 3));
    const result = partition(items, threePer);
    assert.deepStrictEqual(result, [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7],
    ]);
  });

  it("Splits an array into groups given a named partitioning function", () => {
    const items = [
      { type: "bar", id: 0 },
      { type: "foo", id: 1 },
      { type: "bar", id: 2 },
      { type: "foo", id: 3 },
      { type: "baz", id: 4 },
      { type: "foo", id: 5 },
      { type: undefined, id: 6 },
      { type: "foo", id: 7 },
    ];
    const byType = ({ type }: { type?: string } = {}) => type;
    const result = partition(items, byType);
    assert.deepStrictEqual(result, {
      bar: [items[0], items[2]],
      foo: [items[1], items[3], items[5], items[7]],
      baz: [items[4]],
      [DEFAULT]: [items[6]],
    });
  });

  it("Passes a context into the partitioning function", () => {
    const context: any = {};
    function mapIndex() {
      assert.strictEqual(this, context);
    }
    partition([0], mapIndex, context);
  });

  it("Throws if it recieves a mix of partitioning function result types", () => {
    const items = [0, 1, 2, 3, 4, 5, 6, 7];
    const returns = [undefined, null, false, true, 0, 1, 2, "", "1"];
    const mapIndex = (_: any, i: number) => returns[i];
    assert.throws(() => {
      // @ts-expect-error Intentionally breaking the type constraints
      partition(items, mapIndex);
    });
  });

  it("Throws if the partitioning function returns something invalid", () => {
    const items = [0, 1, 2, 3, 4, 5, 6, 7];
    assert.throws(() => {
      // @ts-expect-error Intentionally breaking the type constraints
      partition(items, () => ({}));
    });
    assert.throws(() => {
      // @ts-expect-error Intentionally breaking the type constraints
      partition(items, () => []);
    });
    assert.throws(() => {
      // @ts-expect-error Intentionally breaking the type constraints
      partition(items, () => new Date());
    });
  });

  it("Should default to pair if it cannot infer an appropriate type", () => {
    assert.deepEqual(
      partition([], (a) => a),
      [[], []]
    );
  });
});
