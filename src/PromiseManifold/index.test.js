// TODO: This is jasmine test code; convert to node native.
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
      expect(this).toBe(m);
      ran = true;
    });
    await m.run();
    expect(ran).toBe(true);
  });
  it("allows a custom context", async () => {
    const ctx = {};
    const m = new PromiseManifold(ctx);
    let ran = false;
    m.add("TEST", function () {
      expect(this).toBe(ctx);
      ran = true;
    });
    await m.run();
    expect(ran).toBe(true);
  });
  it("passes arguments to promisors", async () => {
    let result;
    const m = new PromiseManifold();
    m.add("test", (...args) => {
      result = args;
    });
    await m.run(1, 2, 3);
    expect(result).toEqual([1, 2, 3]);
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
      expect(runs).toEqual([1, 2]);
    });
    it("runs pipelines in parallel", async () => {
      const m = new PromiseManifold();
      m.add("EARLY", asyncOp(0, 5, 11, 12));
      m.add("LATE", asyncOp(3, 5, 21, 22));
      const promise = m.run();
      // jasmine.clock().tick(1000);
      const result = mapToObject(await promise);
      expect(runs).toEqual([11, 21, 12, 22]);
      expect(result).toEqual(
        jasmine.objectContaining({
          EARLY: [[11, 12]],
          LATE: [[21, 22]],
        }),
      );
    });
    it("can move actions from one pipeline to another", async () => {
      const m = new PromiseManifold();
      m.add("EARLY", asyncOp(0, 5, 11, 12));
      m.add("LATE", asyncOp(3, 5, 21, 22));
      m.move("LATE", "EARLY");
      const promise = m.run();
      // jasmine.clock().tick(1000);
      const result = mapToObject(await promise);
      expect(runs).toEqual([11, 12, 21, 22]);
      expect(result).toEqual(
        jasmine.objectContaining({
          EARLY: [
            [11, 12],
            [21, 22],
          ],
        }),
      );
    });
    it("move doesn't throw if there's nothing in the source pipeline", async () => {
      const m = new PromiseManifold();
      m.add("EARLY", () => {});
      m.move("LATE", "EARLY");
      await m.run();
    });
  });

  it("can be used as a way to roll up redux actions", async () => {
    const m = new PromiseManifold();
    const raw = { type: "raw" };
    const thunk = { type: "thunk" };
    const aThunk = { type: "asyncThunk" };

    const aThunkCreator = jasmine.createSpy(aThunk.type).and.resolveTo(aThunk);
    const thunkCreator = jasmine.createSpy(thunk.type).and.returnValue(thunk);

    const mockDispatch = jasmine.createSpy("dispatch");
    m.addAction("actions", thunkCreator, aThunkCreator, raw);
    await m.toReduxAction()(mockDispatch);
    expect(mockDispatch).toHaveBeenCalledWith(thunkCreator);
    expect(mockDispatch).toHaveBeenCalledWith(aThunkCreator);
    expect(mockDispatch).toHaveBeenCalledWith(raw);
  });
});
