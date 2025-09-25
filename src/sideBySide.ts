import { inspect } from "node:util";

const isIterable = (o: any): o is Iterable<any> =>
  typeof o === "object" && Symbol.iterator in o;

function iterablesEqual(a: Iterable<any>, b: Iterable<any>) {
  const ia = a[Symbol.iterator]();
  const ib = b[Symbol.iterator]();
  let na = ia.next();
  let nb = ib.next();
  while (!na.done && !nb.done) {
    if (!looselyEqual(na.value, nb.value)) {
      return false;
    }
    na = ia.next();
    nb = ib.next();
  }

  return true;
}

function byEntryKey([keyA]: [string, any], [keyB]: [string, any]) {
  if (keyA > keyB) return -1;
  if (keyA < keyB) return 1;
  return 0;
}

function looselyEqual(a: any, b: any) {
  if (a === b) {
    return true;
  }
  if (isIterable(a) && isIterable(b)) {
    const eq = iterablesEqual(a, b);
    return eq;
  }
  if (typeof a === "object" && typeof b === "object") {
    const eq = iterablesEqual(
      Object.entries(a).sort(byEntryKey),
      Object.entries(b).sort(byEntryKey)
    );
    return eq;
  }
  return false;
}

type Insert<T> = {
  operation: "+";
  index: number;
  count: number;
  items: T[];
};
type Delete<T> = {
  operation: "-";
  index: number;
  count: number;
  items?: T[];
};
type Copy<T> = {
  operation: "=";
  index: number;
  count: number;
  items?: T[];
};
type Change<T> = Insert<T> | Delete<T> | Copy<T>;

function myersDiff<T>(a: T[], b: T[], full = false): Change<T>[] {
  const diff: Change<T>[] = [];
  function shortestEdit() {
    const n = a.length;
    const m = b.length;
    const max = n + m;
    const v: number[] = new Array(2 * max + 1);
    v[1] = 0;
    const trace = [];
    for (let d = 0; d <= max; d++) {
      trace.push([...v]);
      for (let k = -d; k <= d; k += 2) {
        let x: number;
        if (
          k === -d ||
          (k !== d && (v.at(k - 1) as number) < (v.at(k + 1) as number))
        ) {
          x = v.at(k + 1) as number;
        } else {
          x = (v.at(k - 1) as number) + 1;
        }
        let y = x - k;
        while (x < n && y < m && looselyEqual(a[x], b[y])) {
          x++;
          y++;
        }
        v[(k + v.length) % v.length] = x;
        if (x >= n && y >= m) {
          return trace;
        }
      }
    }
  }
  function* backtrack() {
    let x: number = a.length;
    let y: number = b.length;
    let prevX;
    let prevY;
    const edit = shortestEdit() ?? [];
    for (let d = edit.length - 1; d >= 0; d--) {
      const v = edit[d];
      const k = x - y;
      const prevK =
        k +
        (k === -d ||
        (k !== d && (v.at(k - 1) as number) < (v.at(k + 1) as number))
          ? 1
          : -1);
      prevX = v.at(prevK) as number;
      prevY = prevX - prevK;
      // Run the diagonals
      while (x > prevX && y > prevY) {
        yield [x - 1, y - 1, x, y];
        x--;
        y--;
      }
      if (d > 0) {
        yield [prevX, prevY, x, y];
        x = prevX;
        y = prevY;
      }
    }
  }
  let index = 0;
  let lastOp = "";
  for (let [prev_x, prev_y, x, y] of backtrack()) {
    const a_line = a.slice(prev_x, x);
    const b_line = b.slice(prev_y, y);
    const ins = x === prev_x && b_line.length > 0;
    const del = y === prev_y && a_line.length > 0;
    const eq = !ins && !del && a_line.length > 0;
    if (ins) {
      const merge = lastOp === "+";
      const prev = (
        merge
          ? (diff[0] as Insert<T>)
          : { index, operation: "+", count: 0, ...(full && { items: [] }) }
      ) as Insert<T>;
      prev.items.unshift(...b_line);
      prev.count += b_line.length;
      if (!merge) {
        diff.unshift(prev);
      }
      lastOp = "+";
    }
    if (del) {
      const merge = lastOp === "-";
      const prev: Delete<T> = (
        merge
          ? diff[0]
          : { index, operation: "-", count: 0, ...(full && { items: [] }) }
      ) as Delete<T>;
      prev.index = index;
      prev.count += a_line.length;
      if (full) {
        prev.items?.unshift?.(...a_line);
      }
      if (!merge) {
        diff.unshift(prev);
      }
      lastOp = "-";
    }
    if (eq && full) {
      const merge = lastOp === "=";
      const prev: Copy<T> = (
        merge
          ? diff[0]
          : { index, operation: "=", count: 0, ...(full && { items: [] }) }
      ) as Copy<T>;
      prev.count += a_line.length;
      if (full) {
        prev.items?.unshift?.(...a_line);
      }
      if (!merge) {
        diff.unshift(prev);
      }
      lastOp = "=";
    }
    lastOp = diff[0].operation;
  }
  for (let i = 0; i < diff.length; i++) {
    const d = diff[i];
    d.index = index;
    if (d.operation === "=" || d.operation === "+") {
      index += d.count;
    }
    if (i === 0) continue;
    const lastOp = diff[i - 1].operation;
  }
  return diff;
}

const ansiPadEnd = (str: string, length: number, pad = " ") => {
  const padding = length - str.replace(/\x1b\[[\d;]+m/g, "").length;
  if (padding <= 0) {
    return str;
  }
  return (
    str + new Array(padding / pad.length).fill(pad).join("").slice(0, padding)
  );
};

export const sideBySide = (a: any, b: any, inspectOptions = {}) => {
  const ia = inspect(a, inspectOptions);
  const ib = inspect(b, inspectOptions);
  const maxLineLen = process.env.COLUMNS
    ? Math.floor((parseInt(process.env.COLUMNS) - 3) / 2)
    : `${ia}\n${ib}`.split("\n").reduce((x, l) => Math.max(x, l.length), 0);
  const diff = myersDiff([...ia], [...ib], true);
  const pieces: [string[], string[]] = [[], []];
  for (const d of diff) {
    const item = d.items?.join("");
    if (d.operation === "=") {
      pieces[0].push(`\x1b[0m${item}`);
      pieces[1].push(`\x1b[0m${item}`);
    }
    if (d.operation === "-") {
      pieces[0].push(`\x1b[41m${item}`);
      pieces[1].push(`\x1b[0m`);
    }
    if (d.operation === "+") {
      pieces[0].push(`\x1b[0m`);
      pieces[1].push(`\x1b[42m${item}`);
    }
  }
  const lines = pieces.map((bits) => bits.join("").split("\n"));
  const buf = [];
  for (let i = 0; i < lines[0].length; i++) {
    buf.push(
      `${ansiPadEnd(lines[0][i], maxLineLen)} | ${ansiPadEnd(
        lines[1][i],
        maxLineLen
      )}`
    );
  }
  return buf.join("\n");
};

console.constructor.prototype.diff = function (left: any, right: any) {
  this.info(sideBySide(left, right));
};
