import { Manifold } from "./Manifold.ts";
import { describe, it } from "node:test";
import { deepStrictEqual, strict, strictEqual, throws } from "node:assert";

async function sumOf(x?: number[]) {
  return x?.reduce((acc, val) => acc + val, 0);
}
const addN = (n: number) =>
  Object.defineProperty(async (x: number) => x + n, "name", {
    value: `add${n}`,
  });

let broken = false;
const addExclusiveN = (n: number) =>
  Object.defineProperty(
    async (x: number) => {
      if (broken) {
        throw new Error("broken");
      }
      broken = true;
      await new Promise((r) => setTimeout(r, 0));
      broken = false;
      return x + n;
    },
    "name",
    {
      value: `add${n}`,
    }
  );

describe.only("Manifold", () => {
  it("should look and act like a function", async () => {
    const manifold = new Manifold();
    strictEqual(typeof manifold, "function");
    strictEqual(manifold.name, "__");
    strictEqual(manifold.toString(), "Manifold(())");
    strictEqual(await manifold(), undefined);
  });
  it("should handle just a converger", async () => {
    const manifold = new Manifold().converge(sumOf);
    strictEqual(typeof manifold, "function");
    strictEqual(manifold.name, "__sumOf");
    strictEqual(manifold.toString(), "Manifold(sumOf())");
    strictEqual(await manifold(1, 2, 3), 6);
  });

  it("should create a well-described manifold from branches", async () => {
    const manifold = new Manifold<number, number, number>()
      .named("coolThing")
      .branch(addN(1), addN(2), addN(3))
      .converge(sumOf);
    strictEqual(manifold.name, "coolThing");
    strictEqual(
      manifold.toString(),
      "Manifold(coolThing: sumOf(add1 | add2 | add3))"
    );
    strictEqual(await manifold(1), 9);
  });

  it("should limit concurrency", async () => {
    const manifold = new Manifold<number, number, number>()
      .named("coolThing")
      .branch(addExclusiveN(1), addExclusiveN(2), addExclusiveN(3))
      .concurrent(1)
      .converge(sumOf);
    strictEqual(manifold.name, "coolThing");
    strictEqual(
      manifold.toString(),
      "Manifold[1](coolThing: sumOf(add1 | add2 | add3))"
    );
    strictEqual(await manifold(1), 9);
  });

  it("should return the results if no coverger", async () => {
    const manifold = new Manifold<number, number, number>()
      .named("coolThing")
      .branch(addExclusiveN(1), addExclusiveN(2), addExclusiveN(3))
      .concurrent(1);
    strictEqual(manifold.name, "coolThing");
    strictEqual(
      manifold.toString(),
      "Manifold[1](coolThing: (add1 | add2 | add3))"
    );
    deepStrictEqual(await manifold(1), [2, 3, 4]);
  });

  it("throw for an invalid concurrency value, but otherwise assign", () => {
    throws(() => {
      new Manifold().concurrent(-1);
    });
    throws(() => {
      new Manifold().concurrent(Infinity);
    });
    throws(() => {
      new Manifold().concurrent(parseInt("Not a Number"));
    });
    throws(() => {
      new Manifold().concurrent(2.5);
    });
    strictEqual(new Manifold().concurrent(5).concurrency, 5);
  });
});
