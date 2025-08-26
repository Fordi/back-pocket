import { describe, it } from "node:test";
import { strictEqual } from "node:assert";
import { EMAIL_REGEX } from "./email-regexp.js";

// Mostly from https://en.wikipedia.org/wiki/Email_address
const invalidAddresses = [
  // no @ character
  `abc.example.com`,
  // only one @ is allowed outside quotation marks
  `a@b@c@example.com`,
  // unterminated quote
  `a"@example.com`,
  // none of the special characters in this local-part are allowed outside quotation marks
  `a(b@example.com`,
  `a)bl@example.com`,
  `a,b@example.com`,
  `a:b@example.com`,
  `a;b@example.com`,
  `a<b@example.com`,
  `a>b@example.com`,
  `a[b@example.com`,
  `a]b@example.com`,
  // quoted strings must be dot separated or be the only element making up the local-part
  `just"not"right@example.com`,
  `just."not"right@example.com`,
  `just"not".right@example.com`,
  `"not"right@example.com`,
  `just"wrong"@example.com`,
  // spaces, quotes, and backslashes may only exist when within quoted strings and preceded by a backslash
  `not"allowed@example.com`,
  `not\\allowed@example.com`,
  `not allowed@example.com`,
  // even if escaped (preceded by a backslash), spaces, quotes, and backslashes must still be contained by quotes
  `still"wrong@example.com`,
  `still wrong@example.com`,
  `still\\wrong@example.com`,
  // local-part is longer than 64 characters
  `1234567890123456789012345678901234567890123456789012345678901234+x@example.com`,
  // underscore is not allowed in domain part,
  `i.like.underscores@but_they_are_not_allowed_in_this_part`,
  // domains may not contain a run of more than one dot
  `double-dot-not-allowed@in..domain`,
  // local-part may not contain an unquoted run of more than one dot
  `double..dot@example.com`,
];

const validAddresses = [
  `simple@example.com`,
  `very.common@example.com`,
  // case is always ignored after the @ and usually before
  `FirstName.LastName@EasierReading.org`,
  // one-letter local-part
  `x@example.com`,
  `long.email-address-with-hyphens@and.subdomains.example.com`,
  // may be routed to user.name@example.com inbox depending on mail server
  `user.name+tag+sorting@example.com`,
  // slashes are a printable character, and allowed
  `name/surname@example.com`,
  // local domain name with no TLD, although ICANN highly discourages dotless email addresses[32]
  `admin@example`,
  // see the List of Internet top-level domains
  `example@s.example`,
  // bangified host route used for UUCP mailers
  `mailhost!username@example.org`,
  // % escaped mail route to user@example.com via example.org
  `user%example.com@example.org`,
  // local-part ending with non-alphanumeric character from the list of allowed printable characters
  `user-@example.org`,
];
const validUnicodeAddresses = [
  // emoji
  `I❤️CHOCOLATE@example.com`,
  // non-roman local-name language examples
  `名無しの権兵衛@example.co.jp`,
  `张三@example.co.cn`,
  `अशोक.कुमार@example.co.in`,
  `Вася.Пупкин@example.co.ua`,
  `שראל.ישראל@example.co.il`,
  `فلان.الفلاني@example.co.ae`,
  // 移动 is currently a valid TLD
  `john.doe@yidong.移动`,
];

const validQuotedAddresses = [
  // quoted double dot
  `"john..doe"@example.org`,
  // bangified host route used for UUCP mailers
  // include non-letters character AND multiple at sign, the first one being double quoted
  `"very.(),:;<>[]\\".VERY.\\"very@\\\\ \\"very\\".unusual"@strange.example.com`,
  // Allow all specials within quoted part
  `"a?b(c)d,e:f;g<h>i[j\\k]l"@example.com`,
  // Partially quoted is allowed, as long as separated by .
  `just."weird but".fine@example.com`,
  `"For some reason,
This is perfectly valid.
Don't ask me."@wat.com`
];

const validIpDomains = [
  // IP addresses are allowed instead of domains when in square brackets, but strongly discouraged
  `postmaster@[123.123.123.123]`,
  // IPv6 uses a different syntax
  `postmaster@[IPv6:2001:0db8:85a3:0000:0000:8a2e:0370:7334]`,
  // IPv6 with shortened syntax
  `postmaster@[IPv6:2001:db8:85a3::8a2e:370:7334]`,
];
const valids = [validAddresses, validQuotedAddresses, validIpDomains, validUnicodeAddresses];
const invalids = [invalidAddresses];

const example = (address, valid) => it(`should return ${valid ? "true" : "false"} for \`${address}\``, () => {
  strictEqual(`${address}: ${EMAIL_REGEX.test(address) ? "valid" : "invalid"}`, `${address}: ${valid ? "valid" : "invalid"}`);
});

describe(`EMAIL_REGEX`, () => {
  for (const group of valids) {
    for (const address of group) {
      example(address, true);
    }
  }

  for (const group of invalids) {
    for (const address of group) {
      example(address, false);
    }
  }
});
