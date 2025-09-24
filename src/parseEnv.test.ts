import { describe, it } from "node:test"
import { COMMENTS, FILE, parseEnv } from "./parseEnv.ts";
import { deepStrictEqual, throws } from "node:assert";

const FIXTURE = `# Environment variables

# Description a key
KEY_NAME="Key value" # Explanation of a value

# Just a description
DESCRIBED="described"

EXPLAINED="explained" # Just an explanation

UNDOCUMENTED="undocumented"
"QUOTED NAME" = Unquoted value
ESCAPED="Line1\\r\\nLine2\\\\Same line, but with a backslash"

VALUELESS


`;



describe("parseEnv", () => {
  it("parses a simple environment file", () => {
    const result = parseEnv(FIXTURE);
    deepStrictEqual(result, {
      KEY_NAME: 'Key value',
      DESCRIBED: 'described',
      EXPLAINED: 'explained',
      UNDOCUMENTED: 'undocumented',
      ["QUOTED NAME"]: "Unquoted value",
      VALUELESS: undefined,
      ESCAPED: "Line1\r\nLine2\\Same line, but with a backslash",
      [COMMENTS]: {
        [FILE]: { key: 'Environment variables', value: '' },
        KEY_NAME: { key: 'Description a key', value: 'Explanation of a value' },
        DESCRIBED: { key: 'Just a description', value: '' },
        EXPLAINED: { key: '', value: 'Just an explanation' },
      },
    })
  });
  it("throws given bad data", () => {
    throws(() => parseEnv(`X^=Y`));
  });
});