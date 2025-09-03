import type { AsArray } from "./AsArray.d.ts";
import type { DeserializationOptions, Step, Steps } from "./Pipelines.d.ts";
import { cacheAccessors } from "./cacheAccessors.ts";
import { ExtensibleFunction } from "./ExtensibleFunction.ts";

const isHidden = (step: any) => !step.hide;

export type JSONSequence<Ops extends Record<string, Step<any, any>>> = {
  type: string;
  name?: string;
  steps: [keyof Ops, ...(keyof Ops)[]];
};

export class Sequence<I, O> extends ExtensibleFunction<I, Promise<O>> {
  #name: string | undefined;
  #steps: Step<any, any>[];
  #stale: (...names: string[]) => void;

  constructor(...steps: Steps<I, O>) {
    super();
    this.#steps = [];
    this.#stale = cacheAccessors(this, "names", "name", "steps", "type");
    (this as unknown as Sequence<any, I>).append(...steps);
  }

  async invoke(...args: AsArray<I>) {
    let final = args;
    for await (final of this.iterate(...args));
    return final as O;
  }

  async *iterate(...args: AsArray<I>) {
    for (const step of this.#steps) {
      args = await step(...(Array.isArray(args) ? args : [args]));
      yield args;
    }
  }

  append<R>(...next: Steps<O, R> | []) {
    this.#steps.push(...next);
    if (next.length) {
      this.#stale("name", "names", "steps");
    }
    return this as unknown as Sequence<I, R>;
  }

  copy<R = O>(...next: Steps<O, R> | []) {
    const newSteps = [...this.#steps, ...next];
    return new Sequence<I, R>(...(newSteps as Steps<I, R>));
  }

  get names() {
    return Object.freeze(this.#steps.filter(isHidden).map(({ name }) => name));
  }

  get name() {
    return this.#name ?? this.names.join('__');
  }

  get steps() {
    return Object.freeze([...this.#steps.filter(isHidden)]);
  }

  get type() {
    return this.constructor.name;
  }

  named(newName: string) {
    this.#name = newName;
    return this.append();
  }

  static fromJSON<I = any, O = any>(
    { name, steps }: JSONSequence<typeof operations>,
    operations: Record<string, Step<any, any>>,
    options?: DeserializationOptions<I, O>,
  ): Sequence<I, O> {
    const opNames = new Set(Object.keys(operations));
    const stepOps = steps.map((name) => {
      if (!opNames.has(name)) {
        throw new Error(
          `Available operations are ${Object.keys(operations).join(", ")}; got ${name} instead`,
        );
      }
      return operations[name];
    });
    const hidden = (op: Step<any, any>) =>
      Object.assign((...args: AsArray<I>) => op(...args), { hide: true });
    if (options?.before) {
      stepOps.unshift(hidden(options.before) as Step<I, any>);
    }
    if (options?.after) {
      stepOps.push(hidden(options.after) as Step<any, I>);
    }
    const sequence = new this(...(stepOps as Steps<I, O>));
    if (name) {
      sequence.named(name);
    }
    return sequence;
  }

  static fromString<I, O>(
    json: string,
    operations: Record<string, Step<any, any>>,
    options?: DeserializationOptions<I, O>,
  ): Sequence<I, O> {
    let payload;
    if (json.startsWith(`${this.name}(`)) {
      const [jSteps, name] = json
        .slice(this.name.length + 1, json.length - 1)
        .split(":")
        .reverse()
        .map(s => s.trim());
      const steps = [...jSteps.split(/->|,|→/).map((s) => s.trim())];
      payload = { type: this.name, name, steps: [steps[0], ...steps.slice(1)] };
    } else {
      payload = JSON.parse(json);
    }
    return this.fromJSON(payload, operations, options);
  }

  toJSON(): JSONSequence<Record<string, Step<any, any>>> {
    return { type: this.type, name: this.name, steps: [this.names[0], ...this.names.slice(1)] };
  }

  toString() {
    return `${this.type}(${this.#name ? `${this.#name}: ` : ""}${this.names.join(" -> ")})`;
  }
}
