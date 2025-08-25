// Regular expression that should properly match any email address, and reject anything invalid
// Must be converted to a RegExp with the `u` flag.
export const createEmailRegex = ({
  quotes = true,
  ips = true,
  unicode = true,
} = {}) => {
  // localPart is from from https://www.ietf.org/rfc/rfc822.txt section D
  const localPart = (() => {
    const nonAscii = unicode ? `\u0100-\u{10FFFF}` : "";
    const char = `[\\x00-\\x7F${nonAscii}]`;
    // char, without 0-31 (CTL), SPACE, (, ), <, >, @, comma, ;, :, \, ", ., [, ] (collectively, SPECIALS)
    const atomChar = `[!#-'*+\\-/0-9=?A-Z\\^_\`a-z\\{|\\}~${nonAscii}]`;
    const atom = `${atomChar}+`;
    const linearWhiteSpace = `\\r\\n[\\s\\t]*`;
    let localPartTerm;
    if (quotes) {
      const quotedChar = `[\\x00-\\x09\\x0B-\\x20!#-/0-9:-@A-Z\\[\\]-\`a-z\\{-~\\x7F${nonAscii}]`;
      const escape = `\\\\`;
      const quotedEscapeSequence = `${escape}${char}`;
      const quoted = `"(?:${quotedChar}|${linearWhiteSpace}|${quotedEscapeSequence})*"`;
      localPartTerm = `(?:${atom}|${quoted})`;
    } else {
      localPartTerm = atom;
    }
    const maxLen = 64;
    const maxRx = `(?<!.{${maxLen + 1}})`;
    return `${localPartTerm}(?:\\.${localPartTerm})*${maxRx}`;
  })();

  // RFC822 domains are too-loosely constrained, designed to allow for pre-internet, network-internal "domains".
  // Instead, we'll use internet domain names from https://www.ietf.org/rfc/rfc1035.txt section 2.3.1
  const domain = (() => {
    // Rule slightly altered to allow non-recursive construction, since regexes don't do that.
    const nameChar = unicode ? `[\\p{L}\\p{N}\\-]` : `[a-zA-Z0-9\\-]`;
    const subDomain = `${nameChar}+`;
    const domainName = `${subDomain}(?:\\.${subDomain})*`;
    if (ips) {
      const octet = `(?:[0-9]|[0-9]{2}|[01][0-9]{2}|2[0-4][0-9]|25[0-5])`;
      const ipv6Address = `\\[IP[vV]6(?:(:\\p{Hex_Digit}{0,4}){1,8})\\]`;
      const ipv4Address = `\\[${octet}(?:\\.${octet}){3}\\]`;
      return `(?:${domainName}|${ipv6Address}|${ipv4Address})`;
    }
    return domainName;
  })();
  const addrSpec = `(${localPart})@(${domain})`;
  return new RegExp(`^${addrSpec}$`, "u");
};
