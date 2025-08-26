const localPart = () => {
  const nonAscii = `\u0100-\u{10FFFF}`;
  const char = `[\\x00-\\x7F${nonAscii}]`;
  // char, without 0-31 (CTL), SPACE, (, ), <, >, @, comma, ;, :, \, ", ., [, ] (collectively, SPECIALS)
  const atomChar = `[!#-'*+\\-/0-9=?A-Z\\^_\`a-z\\{|\\}~${nonAscii}]`;
  const atom = `${atomChar}+`;
  const linearWhiteSpace = `\\r\\n[\\s\\t]*`;

  const quotedChar = `[\\x00-\\x09\\x0B-\\x20!#-/0-9:-@A-Z\\[\\]-\`a-z\\{-~\\x7F${nonAscii}]`;
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
