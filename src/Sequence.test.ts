import { Sequence } from "./Sequence.ts";
import { describe, it } from "node:test";
import { deepStrictEqual, strictEqual, throws } from "node:assert";

function step1(input: number) {
  return input + 1;
}

function step2(input: number) {
  return input * 2;
}

function step3(input: number) {
  return String(input);
}

describe("Sequence", () => {
  it("should create a well-described sequence from steps", async () => {
    const seq = new Sequence(step1, step2, step3);
    strictEqual(seq.name, "step1__step2__step3");
    strictEqual(seq.toString(), "Sequence(step1 -> step2 -> step3)");
    seq.named("TheSequence");
    strictEqual(seq.toString(), "Sequence(TheSequence: step1 -> step2 -> step3)");
    deepStrictEqual(seq.steps, [step1, step2, step3]);
    deepStrictEqual(seq.toJSON(), {
      type: "Sequence",
      name: "step1__step2__step3",
      steps: ["step1", "step2", "step3"],
    });
    deepStrictEqual(seq.names, ["step1", "step2", "step3"]);
    strictEqual(await seq.invoke(2), "6");
  });

  it("should be amendable", async () => {
    const seq = new Sequence(step1);
    seq.append(step2, step3).named("String(2n + 2)");
    deepStrictEqual(seq.steps, [step1, step2, step3]);
    strictEqual(seq.name, "String(2n + 2)");
    strictEqual(await seq.invoke(2), "6");
  });

  it("should be composable", async () => {
    const base = new Sequence(step1);
    const seq1 = base.copy(step2);
    const seq2 = base.copy(step3);
    deepStrictEqual(base.steps, [step1]);
    deepStrictEqual(seq1.steps, [step1, step2]);
    deepStrictEqual(seq2.steps, [step1, step3]);
    strictEqual(await base.invoke(2), 3);
    strictEqual(await seq1.invoke(2), 6);
    strictEqual(await seq2.invoke(2), "3");
  });

  it("should be creatable from JSON", async () => {
    const seq = new Sequence(step1, step2, step3);
    const json = JSON.stringify(seq.toJSON());
    const fromJson = Sequence.fromJSON(JSON.parse(json), {
      step1,
      step2,
      step3,
    });
    deepStrictEqual(fromJson.steps, seq.steps);
    strictEqual(await fromJson(2), await seq(2));
  });

  it("should be creatable from string", async () => {
    const seq = new Sequence(step1, step2, step3);
    const str = seq.toString();
    const fromString = Sequence.fromString(str, {
      step1,
      step2,
      step3,
    });
    deepStrictEqual(fromString.steps, seq.steps);
    strictEqual(await fromString(2), await seq(2));
    strictEqual(fromString.toString(), seq.toString())
  });

  it("should allow hidden coercion functions, to assert types", async () => {
    const seq = new Sequence(step1, step2, step3);
    const str = seq.toString();
    const fromString = Sequence.fromString(str, {
      step1,
      step2,
      step3,
    }, {
      before: (input: number) => input,
      after: (input: any) => String(input),
    });
    deepStrictEqual(fromString.steps, seq.steps);
    strictEqual(await fromString(2), await seq(2));
    strictEqual(fromString.toString(), seq.toString())
  });

  it("should be creatable from JSON string", async () => {
    const seq = new Sequence(step1, step2, step3);
    const str = JSON.stringify(seq);
    const fromString = Sequence.fromString(str, {
      step1,
      step2,
      step3,
    });
    deepStrictEqual(fromString.steps, seq.steps);
    strictEqual(await fromString(2), await seq(2));
  });

  it("should throw on hydration if a named part is missing", async () => {
    const seq = new Sequence(step1, step2, step3);
    const json = seq.toJSON();
    throws(() => {
      Sequence.fromJSON(json, {
        step1,
        step3,
      });
    });
  });
});
