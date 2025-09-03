import type { AsArray } from "./AsArray.d.ts";

export type Step<I, O> = (...args: AsArray<I>) => O | Promise<O>;
export type Steps<I, O> =
  | [Step<I, any>, ...Step<any, any>[], Step<any, O>]
  | [Step<I, O>];
export type DeserializationOptions<I, O> = {
  before?: Step<I, any>;
  after?: Step<any, O>;
};

