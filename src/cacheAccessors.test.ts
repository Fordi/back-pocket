import { cacheAccessors } from "./cacheAccessors.ts";
import { describe, it } from "node:test";
import { strictEqual, throws } from "node:assert";
class HasAccessors {
  markStale: (...names: string[]) => void;
  constructor() {
    this.markStale = cacheAccessors(this, "name", "age");
  }
  nameCalls = 0;
  get name() {
    this.nameCalls++;
    return "John";
  }

  #age = 30;
  ageGetCalls = 0;
  ageSetCalls = 0;
  get age() {
    this.ageGetCalls++;
    return this.#age;
  }

  set age(value: number) {
    this.#age = value;
    this.ageSetCalls++;
  }

  dobCalls = 0;
  get dob() {
    this.dobCalls++;
    return new Date(1990, 0, 1);
  }

  access() {
    for (let i = 0; i < 5; i++) {
      this.name;
      this.age;
      this.dob;
    }
  }
}

describe("cachedAccessor", () => {
  it("should cache accessors", () => {
    const subject = new HasAccessors();
    subject.access();
    strictEqual(subject.nameCalls, 1);
    strictEqual(subject.ageGetCalls, 1);
    strictEqual(subject.dobCalls, 5);
  });

  it("should stale accessors by name", () => {
    const subject = new HasAccessors();
    subject.access();
    subject.markStale("name");
    subject.access();
    strictEqual(subject.nameCalls, 2);
    strictEqual(subject.ageGetCalls, 1);
    strictEqual(subject.dobCalls, 10);
  });

  it("should stale accessors all accessors if no names passed", () => {
    const subject = new HasAccessors();
    subject.access();
    subject.markStale();
    subject.access();
    strictEqual(subject.nameCalls, 2);
    strictEqual(subject.ageGetCalls, 2);
    strictEqual(subject.dobCalls, 10);
  });

  it("should throw if accessor doesn't exist", () => {
    throws(() => {
      cacheAccessors({}, "missing");
    });
  });

  it("should stale on set accessor", () => {
    const subject = new HasAccessors();
    subject.access();
    strictEqual(subject.ageGetCalls, 1);
    subject.age = subject.age + 1;
    strictEqual(subject.ageGetCalls, 1);
    strictEqual(subject.ageSetCalls, 1);
    subject.age;
    strictEqual(subject.ageGetCalls, 2);
  });
});
