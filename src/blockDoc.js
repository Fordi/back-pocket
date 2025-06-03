
/**
 * A templated multiline string, with compensation for code style indents.
 * @param template See String.raw
 * @param substitutions See String.raw
 * @returns unindented string
 */
export function blockDoc(template, ...substitutions) {
  const lines = String.raw(template, ...substitutions).split('\n');
  // Skip reading the first line, since that's going to be where the '`' starts, so it won't be indented.
  const spaces = lines.slice(1).reduce((mindent, line) => {
    if (!line.trim()) {
      return mindent;
    }
    const matched = (line.match(/^\s*/) ?? [])[0]?.length ?? 0;
    return Math.min(mindent, matched);
  }, Infinity);
  const dedentRx = new RegExp(`^\\s{0,${spaces}}`);
  while (lines[0].trim() === '') {
    lines.shift();
  }
  return lines.map((line) => line.replace(dedentRx, '')).join('\n');
};
