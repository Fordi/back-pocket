import assert from "node:assert";
import { describe, it } from "node:test";
import { generatePkceChallenge } from "./generatePckeChallenge.ts";

const FIXTURES = [
  ["VWtTkl1U3pLe4FTP_O9P2cqOrsA", "nWDaLkdBEDjcWRiN5gPF_NIHB27CQ-fI5uFqd4HVNgc"],
  ["h3ZYFJQ5BBd9yA", "WR1H79NpJvvGgbQL4xSxsyVNngY3S0s2lyziom-aad8"],
  ["8T4qcRIFOPTjww", "MAv8W7pk-fXVqD5SpY-QCcKsVpa3GfO5axc2QCBxDqs"],
  ["Ug3Y4c7oGiT20AozI1VaBuBBNlRwzR5P_BpOE84", "pMSpQd18j-Wva-kDGPu43MxJyKi0OoKuxpsRNPQVNYw"],
  ["6hV8Qvtn3B1wa5ksrqWGnNVoQ6gofLk", "D1nSxkeqMKw81Kh5Zenivb6WzbT9y8X87K4hziMiJnY"],
  ["Sb1_2cqIyCTCJpbz3ShQ_uoQaWmNX6wSezQ", "zv7D6gi8y2R7f0Jso_DkAbtyP1rdftWTqCYh3yIocE4"],
  ["yOSx6kzJ7StlJmx1O3rzRI0aTgfPQX_4mA", "nbysVwudAG8BsYTxUBeaFCh4qxRZ86EGdlLJ8PE6_fo"],
  ["jRdoodz-3P9KQaYQPFz9VZc", "SyIoM6rhwG56rc_uY9FNcksXkVMFew9K1HUsAzVhPbE"],
  ["rI6shb3V35sD71rziNNwkRz3TSId", "vAmNh3kvpfpR4tGMhunPfieoV61QCX3GaWN6O_iCPT0"],
  ["yXjSYF7nu4NQu5lla28jyykJDtVRG3on87o", "n8EOUGJdKJapsZXjR5YvMufjLuP69WSl9SolLRKlBD8"]
];

describe("generatePckeChallenge", () => {
  for (const [input, output] of FIXTURES) {
    it(`returns ${output} given ${input}`, async () => {
      assert.strictEqual(await generatePkceChallenge(input), output);
    });
  }
});