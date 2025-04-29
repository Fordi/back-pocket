export const createEmailRegex = (() => {
  // localPart is from from https://www.ietf.org/rfc/rfc822.txt section D
  const localPart = (() => {
    const char = '[\\x00-\\x7F]';
    // char, without 0-31 (CTL), SPACE, (, ), <, >, @, comma, ;, :, \, ", ., [, ] (collectively, SPECIALS)
    const atom = `[!#-'*+\\-\\/0-9=?A-Z\\^_\`a-z\\{|\\}~]+`;
    // char, without ", \, \n, but including linearWhiteSpace
    const linearWhiteSpace = `(?:\r\n[\s\t]*)+`;
    const qtext = `(?:[\\x00-\\x09\\x0B-\\x20!#-/0-9:-@A-Z\\[\\]-\`a-z{-~\\x7F]|${linearWhiteSpace})`;
    const quotedPair = `\\\\${char}`;
    const quotedString = `"(?:${qtext}|${quotedPair})*"`;
    const word = `(?:${atom}|${quotedString})`;
    return `${word}(?:\\.${word})*`;
  })();
  // RFC822 domains are too-loosely constrained, designed to allow for pre-internet, network-internal "domains".
  // Instead, we'll use internet domain names from https://www.ietf.org/rfc/rfc1035.txt section 2.3.1
  const domain = (() => {
    // Rule slightly altered to allow non-recursive construction, since regexes don't do that.
    const letDigHyp = `[a-zA-Z0-9\\-]`;
    const subDomain = `${letDigHyp}+`;
    return `${subDomain}(?:\.${subDomain})*`;
  })();
  const addrSpec = `${localPart}@${domain}`;
  return new RegExp(`^${addrSpec}$`);
});