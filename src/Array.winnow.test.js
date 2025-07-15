import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { winnow, addToPrototype } from "./Array.winnow.js";

describe("winnow", () => {
  it('Splits an array into two given a filtering function', () => {
    const items = [0, 1, 2, 3, 4, 5, 6, 7];
    const rule = (n) => (n % 2) === 0;
    const [odd, even] = winnow(items, rule);
    assert.deepStrictEqual(odd, [1, 3, 5, 7]);
    assert.deepStrictEqual(even, [0, 2, 4, 6]);
  });
  it("Handles a multitude of return values", () => {
    const isZero = { type: 0 };
    const isTrue = { type: true };
    const isFalse = { type: false };
    const isNull = { type: null };
    const isNeg = { type: -1 };
    const isOne = { type: 1 };
    const isTwo = { type: 2 };
    const isBadger = { type: "badger" };
    const isInfinity = { type: Infinity };
    const isNumeric = { type: '2' };
    const isFloat = { type: 1.5 };
    const isStringFloat = { type: '2.5' };
    const items = [
      isZero,
      isTrue,
      isFalse,
      isOne,
      isTwo,
      isBadger,
      undefined,
      isNull,
      isNeg,
      isInfinity,
      isNumeric,
      isFloat,
      isStringFloat,
    ];
    const rule = ({ type } = {}) => type;
    const results = winnow(items, rule);
    assert.deepStrictEqual(results.matched, results[1]);
    assert.deepStrictEqual(results.unknown, results[0]);
    assert.deepStrictEqual(results, Object.assign(
      [
        [isZero, isFalse, undefined, isNull, isNeg],
        [isTrue, isOne, isInfinity],
        [isTwo, isNumeric],
      ],
      {
        badger: [isBadger],
        '1.5': [isFloat],
        '2.5': [isStringFloat],
      }
    ));
  });
  it("Throws if the winnowing rule returns something it can't turn into a key", () => {
    const items = [0, 1, 2, 3, 4, 5, 6, 7];
    const rule = (n) => ({ key: n });
    assert.throws(() => winnow(items, rule));
  });
});

describe("addToPrototype", () => {
  afterEach(() => {
    delete Array.prototype.winnow;
  });
  it("Adds `winnow` to the `Array` prototype", () => {
    assert.equal(typeof [].winnow, "undefined");
    addToPrototype();
    assert.equal(typeof [].winnow, "function");
    assert.deepStrictEqual([1, 2, 3].winnow(r => r % 3), [[3], [1], [2]]);
  });
  it("Only does it once", () => {
    addToPrototype();
    const w = [].winnow;
    addToPrototype();
    assert.strictEqual(w, [].winnow);
  });
});