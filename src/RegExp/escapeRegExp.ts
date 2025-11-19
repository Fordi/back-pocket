// Loosely based on:
// https://tc39.es/ecma262/multipage/text-processing.html#sec-regexp.escape
//
// The recommended implementation is pretty needlessly complicated from the point-of-view of someone
// with access to `[...string]` and padStart.  This is far simpler, likely faster, and matches its output
// exactly.

// Table of character-specific escape codes
const escapeCodes: Record<string, string> = {
  // standard escape codes
  "\t": "\\t", "\n": "\\n", "\v": "\\v", "\f": "\\f", "\r": "\\r",
  // characters we can escape as `\{char}`
  $: "\\$", "(": "\\(", ")": "\\)", "*": "\\*", "+": "\\+", ".": "\\.", "/": "\\/", "?": "\\?",
  "[": "\\[", "\\": "\\\\", "]": "\\]", "^": "\\^", "{": "\\{", "|": "\\|", "}": "\\}",
  // Characters it would be unsafe to escape as `\{char}`
  " ": "\\x20", "!": "\\x21", '"': "\\x22", "#": "\\x23", "%": "\\x25", "&": "\\x26", "'": "\\x27",
  ",": "\\x2c", "-": "\\x2d", ":": "\\x3a", ";": "\\x3b", "<": "\\x3c", "=": "\\x3d", ">": "\\x3e",
  "@": "\\x40", "`": "\\x60", "~": "\\x7e",
  "\u2028": "\\u2028", // line separator
  "\u2029": "\\u2029", // paragraph separator
};

/**
 * Escape a string for use in a regular expression
 */
export function escapeRegExp(str: string) {
  if (typeof str !== "string") {
    throw new TypeError("input argument must be a string");
  }
  const r = [...str];
  for (let i = 0; i < r.length; i++) {
    const s = r[i];
    // It's a well-known escape
    if (s in escapeCodes) {
      r[i] = escapeCodes[s];
      continue;
    }
    // All further logic done via code point value
    const c = s.codePointAt(0) as number;

    // It's first and its alphanumeric (22.2.5.1/4.a)
    if (
      i === 0 &&
      // 0-9
      ((c >= 48 && c <= 57) ||
        // A-Z
        (c >= 65 && c <= 90) ||
        // a-z
        (c >= 97 && c <= 122))
    ) {
      // We know it's < 0xFF
      r[i] = `\\x${c.toString(16).padStart(2, "0")}`;
    }

    // It's a standalone UTF-16 surrogate for a code point >= 0x10000
    else if ((c & 0xd800) === 0xd800) {
      // We know it's >= 0x100 && <= 0xFFFF; exactly one word needed
      r[i] = `\\u${c.toString(16).padStart(4, "0")}`;
    }
    // Everything else can just pass through.
  }
  return r.join("");
}
/**
 * Restore leading alphanumerics inside pattern
 */
export function restoreLead(pattern: string) {
  return pattern.replace(/(?<!\\0|\\c)\\x([0-9a-fA-F]{2})/g, (_, m, pos) => {
    const c = parseInt(m, 16);
    if (
      pos !== 0 && (
        (c >= 48 && c <= 57) ||
        (c >= 65 && c <= 90) ||
        (c >= 97 && c <= 122)
      )
    ) {
      return String.fromCharCode(c);
    }
    return _;
  });
}
