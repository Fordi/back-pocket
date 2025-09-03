// Based on the RFC 5322 Official Standard: https://www.ietf.org/rfc/rfc5322.txt
const char = `[^\\x80-\\xff]`;
// char, without...  nul - spc    "    (    )    ,    .    :  ;  <    >    @    [  \  ]   anything > del
const atomChar = `[^\\x00-\\x20\\x22\\x28\\x29\\x2c\\x2e\\x3a-\\x3c\\x3e\\x40\\x5b-\\x5d\\x80-\\xff]`;
const atom = `${atomChar}+`;
const linearWhiteSpace = `\\r\\n[\\s\\t]*`;
// anything, but...      \n   "    \
const quotedChar = `[^\\x0d\\x22\\x5c]`;
const escape = `\\\\`;
const quotedEscapeSequence = `${escape}${char}`;
const quoted = `"(?:${quotedChar}|${linearWhiteSpace}|${quotedEscapeSequence})*"`;
const localPartTerm = `(?:${atom}|${quoted})`;

const maxLen = 64;
const maxRx = `(?<!.{${maxLen + 1}})`;

const localPart = `${localPartTerm}(?:\\.${localPartTerm})*${maxRx}`;

// Rule slightly altered to allow non-recursive construction, since regexes don't do that.
// Letters, numbers, hyphens, in any language
const nameChar = `[\\p{L}\\p{N}\\-]`;
const subDomain = `${nameChar}+`;
const domainName = `${subDomain}(?:\\.${subDomain})*`;
// 0..255, any base10 representation.
const octet = `(?:[0-9]|[0-9]{2}|[01][0-9]{2}|2[0-4][0-9]|25[0-5])`;
const ipv4Address = `\\[${octet}(?:\\.${octet}){3}\\]`;

const ipv6Address = `\\[IP[vV]6(?:(:\\p{Hex_Digit}{0,4}){1,8})\\]`;

const domainPart = `(?:${domainName}|${ipv6Address}|${ipv4Address})`;

// Regular expression that should properly match any email address, and reject anything invalid
// Must be converted to a RegExp with the `u` flag.
export const EMAIL_REGEX_STR = `^(${localPart})@(${domainPart})$`;
export const EMAIL_REGEX = new RegExp(EMAIL_REGEX_STR, "u");

export default EMAIL_REGEX;
