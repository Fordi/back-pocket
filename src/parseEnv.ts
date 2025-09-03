type CommentContext = {
  key: string[][];
  value: string[][];
};

type Comment = {
  key?: string,
  value?: string,
};
type KeyValueEntry = [key: string, value: string | undefined, comments: Comment | undefined];
type CommentEntry = [typeof COMMENTS, value: Comment];
type EnvParseContext = {
  line: number;
  entries: (KeyValueEntry | CommentEntry)[];
  comment?: CommentContext;
  var?: string[];
  value?: string[];
  quoted?: string[];
};

/**
 * Straightforward parser for .env files and other files following shell environment syntax.
 * @param content - the env file to parse
 * @returns {object} the environment, as read from the file
 **/
export function parseEnv(content: string): object {
  const context: EnvParseContext = {
    line: 1,
    entries: [],
  };
  let mode = VAR;
  for (let index = 0; index < content.length; index++) {
    const nextMode = mode(context, content[index], content, index) ?? mode;
    mode = nextMode;
  }
  const commentary = {};
  const result: Record<string, string | undefined> & {
    [COMMENTS]?: Record<string, Comment> & {
      [FILE]?: string;
    },
  } = {};
  for (const [key, value, comments] of context.entries) {
    if (key === COMMENTS) {
      commentary[FILE] = value;
    } else {
      result[key] = value;
      if (comments) {
        commentary[key] = comments;
      }
    }
  }
  if (Object.keys(commentary).length) {
    result[COMMENTS] = commentary;
  }
  return result;
}

function getComment(x: EnvParseContext) {
  const comment = x.comment;
  if (!comment) return undefined;
  const [key, value] = [comment.key, comment.value].map((c, i) =>
    c
      .filter((a) => a.length)
      .reverse()
      .map((l) => l.join(""))
      .join("\n")
  );
  const result: Comment = { key, value };
  return result;
}

function VAR(x: EnvParseContext, c: string, b: string, i: number) {
  if (c === "#") return COMMENT;
  if (x.entries.length === 0 && x.comment) {
    x.entries.push([COMMENTS, getComment(x)] as CommentEntry);
    delete x.comment;
  }
  if (c === "=") return VALUE;
  if (c === '"') return QUOTE(c, "var", VAR);
  if (c === "\n" || c === "\r") {
    if (x.var) {
      x.entries.push([x.var.join("").trim(), undefined, undefined]);
    }
    delete x.var;
    return;
  }
  if (/[^A-Za-z0-9_\s\t]/.test(c))
    throw new Error(
      `Expected A-Z, a-z, 0-9, _, \s, \r, \n, \t, ", or =, but got ${c}`
    );
  if (!x.var) x.var = [];
  x.var.push(c);
}

function COMMENT(x: EnvParseContext, c: string, b: string, i: number) {
  if (!x.comment) x.comment = { key: [[]], value: [[]] };
  const cur = x.value ? x.comment.value : x.comment.key;
  if ((c === " " && !cur[0].length) || c == "#") return;
  if (c === "\r" || c === "\n") {
    if (cur[0].length) {
      cur.unshift([]);
    }
    if (x.value) {
      return VALUE(x, c, b, i);
    }
    return VAR;
  }
  cur[0].push(c);
}
type Parser = (x: EnvParseContext, c: string, b: string, i: number) => Parser | undefined;

function VALUE(x: EnvParseContext, c: string, b: string, i: number) {
  if (c === "#") return COMMENT;
  if (c === '"' || c === "'") return QUOTE(c, "value", VALUE);
  const value = x.value as string[];
  if (c === "\n" || c === "\r") {
    while (value[0] === " " || value[0] === '') {
      value.shift();
    }
    while (value[value.length - 1] === " ") {
      value.pop();
    }
    x.entries.push([(x.var as string[]).join("").trim(), value.join(""), getComment(x)]);
    delete x.var;
    delete x.value;
    delete x.comment;
    return VAR;
  }
  value.push(c);
}

const ESCAPE_MAP = {
  r: '\r',
  n: '\n',
  $: '\$',
};

function ESCAPE(destination: keyof Omit<EnvParseContext, "line" | "entries" | "comment">, self: Parser): Parser {
  return (x: EnvParseContext, c: string, b: string, i: number) => {
    const dest = x[destination] as string[];
    dest.push(ESCAPE_MAP[c] ?? c);
    return self;
  };
}

function QUOTE(type: string, destination: keyof Omit<EnvParseContext, "line" | "entries" | "comment">, self: Parser): Parser {
  const RESUME = (x: EnvParseContext, c: string, b: string, i: number) => {
    if (c === type) {
      if (!x.value) {
        x.value = [];
      }
      x.value.push((x.quoted ?? []).join(""));
      return self;
    }
    if (!x[destination]) {
      x[destination] = [] as string[];
    }
    if (c === "\\") {
      return ESCAPE(destination, RESUME);
    }
    x[destination].push(c);
    return;
  };
  return RESUME;
}

/**
 * The comments on each key are here
 */
export const COMMENTS = Symbol.for("COMMENTS");

/**
 * Special key value for the top comment in the file, if present.
 */
export const FILE = Symbol.for("FILE");

