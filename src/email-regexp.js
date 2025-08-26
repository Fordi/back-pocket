const localPart = () => {
  const nonAscii = `\u0100-\u{10FFFF}`;
  const char = `[\\x00-\\x7F${nonAscii}]`;
  // char, without 0-31 (CTL), SPACE, (, ), <, >, @, comma, ;, :, \, ", ., [, ] (collectively, SPECIALS)
  // const atomChar = `[!#-'*+\\-/0-9=?A-Z\\^_\`a-z\\{|\\}~${nonAscii}]`;
  //                    nul-spc     "    (    )    ,    .    : ; <      >    @    [  \  ]   ...
  const atomChar = `[^\\x00-\\x20\\x22\\x28\\x29\\x2c\\x2e\\x3a-\\x3c\\x3e\\x40\\x5b-\\x5d\\x80-\\xff]`;
  const atom = `${atomChar}+`;
  const linearWhiteSpace = `\\r\\n[\\s\\t]*`;
  //                       \n   "    \
  const quotedChar = `[^\\x0d\\x22\\x5c]`;
  const escape = `\\\\`;
  const quotedEscapeSequence = `${escape}${char}`;
  const quoted = `"(?:${quotedChar}|${linearWhiteSpace}|${quotedEscapeSequence})*"`;
  const localPartTerm = `(?:${atom}|${quoted})`;

  const maxLen = 64;
  const maxRx = `(?<!.{${maxLen + 1}})`;

  return `${localPartTerm}(?:\\.${localPartTerm})*${maxRx}`;
};

const domainPart = () => {
  // Rule slightly altered to allow non-recursive construction, since regexes don't do that.
  const nameChar = `[\\p{L}\\p{N}\\-]`;
  const subDomain = `${nameChar}+`;
  const domainName = `${subDomain}(?:\\.${subDomain})*`;
  
  const octet = `(?:[0-9]|[0-9]{2}|[01][0-9]{2}|2[0-4][0-9]|25[0-5])`;
  const ipv4Address = `\\[${octet}(?:\\.${octet}){3}\\]`;

  const ipv6Address = `\\[IP[vV]6(?:(:\\p{Hex_Digit}{0,4}){1,8})\\]`;

  return `(?:${domainName}|${ipv6Address}|${ipv4Address})`;
};

// Regular expression that should properly match any email address, and reject anything invalid
// Must be converted to a RegExp with the `u` flag.
export const createEmailRegex = () => {
  const addrSpec = `(${localPart()})@(${domainPart()})`;
  return new RegExp(`^${addrSpec}$`, "u");
};
console.log(`(${localPart()})@(${domainPart()})`);