import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import PromiseManifold from "./index.js";

const mapToObject = (map) => {
  const results = {};
  for (const [key, value] of map.entries()) {
    results[key] = value;
  }
  return results;
};

describe("PromiseManifold", () => {
  it("sets a context", async () => {
    const m = new PromiseManifold();
    let ran = false;
    m.add("TEST", function () {
      assert.strictEqual(this, m);
      ran = true;
    });
    await m.run();
    assert.strictEqual(ran, true);
  });
  it("allows a custom context", async () => {
    const ctx = {};
    const m = new PromiseManifold(ctx);
    let ran = false;
    m.add("TEST", function () {
      assert.strictEqual(this, ctx);
      ran = true;
    });
    await m.run();
    assert.strictEqual(ran, true);
  });
  it("passes arguments to promisors", async () => {
    let result;
    const m = new PromiseManifold();
    m.add("test", (...args) => {
      result = args;
    });
    await m.run(1, 2, 3);
    assert.deepEqual(result, [1, 2, 3]);
  });
  describe("order of operations", () => {
    let runs;
    const asyncOp =
      (initialDelay, tweenDelay, ...values) =>
      async () => {
        const thisRun = [];
        await new Promise((r) => setTimeout(r, initialDelay));
        runs.push(values[0]);
        thisRun.push(values[0]);
        for (const value of values.slice(1)) {
          await new Promise((r) => setTimeout(r, tweenDelay));
          runs.push(value);
          thisRun.push(value);
        }
        return thisRun;
      };
    beforeEach(() => {
      runs = [];
      // setTimeouts aren't firing with the clock installed and manually ticked for whatever reason...
      // Whatever, the delays are short...
      // jasmine.clock().install();
    });
    afterEach(() => {
      // jasmine.clock().uninstall();
    });
    it("runs a pipeline serially", async () => {
      const m = new PromiseManifold();
      const runs = [];
      m.add("TEST", () => {
        runs.push(1);
      });
      m.add("TEST", () => {
        runs.push(2);
      });
      const promise = m.run();
      // jasmine.clock().tick(1000);
      await promise;
      assert.deepEqual(runs, [1, 2]);
    });
    it("runs pipelines in parallel", async () => {
      const m = new PromiseManifold();
      m.add("EARLY", asyncOp(0, 5, 11, 12));
      m.add("LATE", asyncOp(3, 5, 21, 22));
      const promise = m.run();
      // jasmine.clock().tick(1000);
      const result = mapToObject(await promise);
      assert.deepEqual(runs, [11, 21, 12, 22]);
      assert.deepEqual(result, {
        EARLY: [[11, 12]],
        LATE: [[21, 22]],
      });
    });
    it("can move actions from one pipeline to another", async () => {
      const m = new PromiseManifold();
      m.add("EARLY", asyncOp(0, 5, 11, 12));
      m.add("LATE", asyncOp(3, 5, 21, 22));
      m.move("LATE", "EARLY");
      const promise = m.run();
      // jasmine.clock().tick(1000);
      const result = mapToObject(await promise);
      assert.deepEqual(runs, [11, 12, 21, 22]);
      assert.deepEqual(result, {
        EARLY: [
          [11, 12],
          [21, 22],
        ],
      });
    });
    it("move doesn't throw if there's nothing in the source pipeline", async () => {
      const m = new PromiseManifold();
      m.add("EARLY", () => {});
      m.move("LATE", "EARLY");
      await m.run();
    });
  });
});
