import type { AsArray } from "./AsArray.d.ts";
import type { ElementOf } from "./ElementOf.d.ts";
import type { DeserializationOptions, Step } from "./Pipelines.d.ts";
import { ExtensibleFunction } from "./ExtensibleFunction.ts";
import { cacheAccessors } from "./cacheAccessors.ts";

export class Manifold<I = [], B = any, O = B[]> extends ExtensibleFunction<
  I,
  Promise<O>
> {
  #converge: ((results?: B[]) => O) | undefined;
  #branches: Step<I, B | ElementOf<O>>[];
  #name: string | undefined;
  #concurrency: number = 0;

  get branchNames() {
    return Object.freeze(this.#branches.map(({ name }) => name));
  }

  get convergeName() {
    return this.#converge?.name;
  }

  get name() {
    return (
      this.#name ?? `${this.branchNames.join("$")}__${this.convergeName ?? ""}`
    );
  }

  get type() {
    return this.constructor.name;
  }

  named(name: string) {
    this.#name = name;
    return this;
  }

  concurrent(n: number) {
    this.concurrency = n;
    return this;
  }

  get concurrency() {
    return this.#concurrency;
  }

  set concurrency(n: number) {
    if (!isFinite(n) || isNaN(n) || n < 1 || !Number.isInteger(n)) {
      throw new Error("concurrency must be a positive integer");
    }
    this.#concurrency = n;
  }

  branch<C>(...fns: Step<I, C>[]) {
    this.#branches.push(...(fns as unknown as Step<I, B>[]));
    return this as Manifold<I, B | C, O | C[]>;
  }

  converge<P extends any[], R>(fn: (results?: P) => R) {
    this.#converge = fn as unknown as (results?: B[]) => O;
    return this as unknown as Manifold<P, B, R>;
  }

  toString() {
    return `${this.type}${this.#concurrency ? `[${this.#concurrency}]` : ""}(${
      this.#name ? `${this.#name}: ` : ""
    }${this.convergeName ?? ""}(${this.branchNames.join(" | ")}))`;
  }

  constructor(converge?: undefined, ...branches: Step<I, ElementOf<O>>[]);
  constructor(converge?: (results?: B[]) => O, ...branches: Step<I, B>[]);
  constructor(
    converge?: undefined | ((results?: B[]) => O),
    ...branches: Step<I, B | ElementOf<O>>[]
  ) {
    super();
    this.#converge = converge;
    this.#branches = branches;
    cacheAccessors(this, "name", "convergeName", "branchNames");
  }

  async invoke(...args: AsArray<I>) {
    if (this.#branches.length === 0) {
      if (!this.#converge) {
        return undefined;
      }
      return this.#converge(args as B[]);
    }
    let results: B[] | O = [];
    if (this.#concurrency === 0) {
      results = (await Promise.all(
        this.#branches.map((branch) => branch(...args))
      )) as B[] | O;
    } else {
      const promises: Set<Promise<B | ElementOf<O>>> = new Set();
      const concurrency = this.#concurrency;
      const branches = this.#branches;
      let i = 0;
      const fill = () => {
        for (; promises.size < concurrency && i < branches.length; i++) {
          const index = i;
          const promise = Promise.resolve(branches[i](...args));
          promise.then((result) => {
            results[index] = result;
            console.log(`Added ${result} as ${index}`);
            promises.delete(promise);
          });
          promises.add(promise);
        }
      };
      while (i < branches.length) {
        fill();
        await Promise.race(promises);
      }
      await Promise.all(promises);
    }
    if (this.#converge === undefined) {
      return results as O;
    }
    return this.#converge(results as B[]);
  }
}
