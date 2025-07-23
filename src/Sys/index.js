const INITIAL_SIZE = 32;

const toIndex = (h) => [h >> 5, h & 31];

const OFS = [];
const Slice = {
  POS: 0,
  VEL: 1,
  ACC: 2,
  BOUND_MIN: 3,
  BOUND_MAX: 4,
  MAX_VEL: 5,
};
const getOfs = (dimension) => {
  if (!OFS[dimension]) {
    OFS[dimension] = {
      POS: dimension * Slice.POS,
      VEL: dimension * Slice.VEL,
      ACC: dimension * Slice.ACC,
      BOUND_MIN: dimension * Slice.BOUND_MIN,
      BOUND_MAX: dimension * Slice.BOUND_MAX,
      MAX_VEL: dimension * Slice.MAX_VEL,
    };
  }
  return OFS[dimension];
};

const magSq = ([dim, bank, ofs]) => {
  let sum = 0;
  for (let i = 0; i < dim; i++) {
    sum += bank[ofs + i]**2;
  }
  return sum;
};

const mag = (spec) => {
  return Math.sqrt(magSq(spec));
};

const clamp = (spec, max) => {
  const maxSq = max**2;
  const magSq = magSq(spec);
  if (magSq <= maxSq) { return; }
  const mul = Math.sqrt(maxSq / magSq);
  const [dim, bank, ofs] = spec;
  for (let i = 0; i < dim; i++) {
    bank[i + ofs] = mul * bank[i + ofs];
  }
};

const applyMotion = ([dim, bank, ofs], dt) => {
  const halfDt = dt / 2;
  const { BOUND_MIN, BOUND_MAX, POS, VEL, ACC, MAX_VEL } = getOfs(dim);

  // Apply half the vel, then acceleration
  let velSq = 0;
  for (let i = 0; i < dim; i += 1) {
    bank[ofs + POS + i] += halfDt * bank[ofs + VEL + i];
    bank[ofs + VEL + i] += dt * bank[ofs + ACC + i];
    velSq += bank[ofs + VEL + i]**2;
  }

  // Clamp velocity
  const maxSq = bank[ofs + MAX_VEL]**2;
  if (velSq > maxSq) {
    const velMul = Math.sqrt(maxSq / velSq);
    for (let i = 0; i < dim; i += 1) {
      bank[ofs + VEL + i] *= velMul;
    }
  }

  // Apply the other half of vel
  for (let i = 0; i < dim; i += 1) {
    bank[ofs + POS + i] += halfDt * bank[ofs + VEL + i];
  }

  // Constrain position to bounds
  for (let i = 0; i < dim; i += 1) {
    bank[ofs + POS + i] = Math.max(
      bank[ofs + BOUND_MIN + i],
      Math.min(
        bank[ofs + BOUND_MAX + i],
        bank[ofs + POS + i]
      )
    )
  }
}

const INITIAL_DEFAULTS = [
  0, 0, 0, 0, 0, 0, -Infinity, -Infinity, Infinity, Infinity, Infinity
];

class MotionSystem {
  #memory;
  #marks;
  #cur = 0;
  #size = 0;
  #freed;
  #accessors;
  #Type;

  #next() {
    const r = this.#cur;
    const [bi, ai] = toIndex(r);
    this.#marks[bi] |= (1 << ai);
    this.#size++;
    return r;
  }

  #isFree(h) {
    const [bi, ai] = toIndex(h);
    if (bi >= this.#marks.length) {
      this.#memory.push(new this.#Type(32 * this.recordSize));
      this.#marks.push(0);
    }
    return !(this.#marks[bi] & (1 << ai));
  }

  #inc() {
    this.#cur += 1;
  }

  constructor(dimension = 2, Type = Float32Array) {
    this.dimension = dimension;
    this.recordSize = dimension * 5 + 1;
    this.#memory = [];
    this.#marks = [];
    this.#freed = [];
    this.#accessors = [];
    this.#Type = Type;
    this.OFS = getOfs(dimension);
  }

  alloc(initialValues = []) {
    if (this.#freed.length) {
      this.#cur = this.#freed.pop();
    }
    while (!this.#isFree(this.#cur)) {
      this.#inc();
    }
    const [dim, bank, ofs] = this.getSpec(this.#cur);
    const l = this.recordSize;
    for (let i = 0; i < l; i++) {
      bank[ofs + i] = initialValues[i] ?? INITIAL_DEFAULTS[i];
    }
    return this.#next();
  }

  free(h) {
    this.#accessors[h] = undefined;
    let [bi, ai] = toIndex(h);
    this.#freed.push(h);
    this.#marks[bi] &= (0xFFFFFFFF ^ (1 << ai));
    while (this.#marks[bi] === 0 && bi === this.#marks.length) {
      this.#marks.pop();
      this.#memory.pop();
      this.#freed = this.#freed.filter((i) => (i >> 5) !== bi);
      bi--;
    }
    this.#size--;
  }
  
  get size() {
    return this.#size;
  }

  get allocated() {
    return this.#memory.length << 5;
  }

  forEach(fn) {
    const dim = this.dimension;
    const rsz = this.recordSize;
    for (let bi = 0; bi < this.#memory.length; bi++) {
      const marks = this.#marks[bi];
      const bank = this.#memory[bi];
      for (let am = 1, ai = 0, ao = 0; ai !== 32; am <<= 1, ai++, ao += rsz) {
        if (marks & am) {
          fn([dim, bank, ao]);
        }
      }
    }
  }

  update(dt) {
    this.forEach((spec) => applyMotion(spec, dt));
  }
  
  getSpec(h, n = 0) {
    const [bi, ai] = toIndex(h);
    return [
      this.dimension,
      this.#memory[bi],
      this.recordSize * ai + this.dimension * n
    ];
  }

  getSlice(h, n) {
    const [dim, bank, ofs] = this.getSpec(h, n);
    return bank.slice(ofs, ofs + dim);
  }

  getValue(h, n, i) {
    if (i < 0 || i > dim) return undefined;
    const [dim, bank, ofs] = this.getSpec(h, n);
    return bank[ofs + Math.min(dim, i)];
  }

  setSlice(h, n, v) {
    const [dim, bank, ofs] = this.getSpec(h, n);
    for (let i = 0; i < dim; i++) {
      bank[ofs + i] = v[i];
    }
  }

  toString(h) {
    const [dim, bank, ofs] = this.getSpec(h);
    const { BOUND_MIN, BOUND_MAX, POS, VEL, ACC, MAX_VEL } = getOfs(dim);
    return [
      `pos: (${bank.slice(ofs + POS, ofs + POS + dim)})`,
      `vel: (${bank.slice(ofs + VEL, ofs + VEL + dim)})`,
      `acc: (${bank.slice(ofs + ACC, ofs + ACC + dim)})`,
      `bounds: (${bank.slice(ofs + BOUND_MIN, ofs + BOUND_MIN + dim)}) -> (${bank.slice(ofs + BOUND_MAX, ofs + BOUND_MAX + dim)})`,
      `max: (${bank[ofs + MAX_VEL]})`,
    ].join(', ');
  }
}

const motionSystem = new MotionSystem();
const particles = [];
const { rows, columns } = process.stdout;
for (let i = 0; i < 100; i++) {
  particles.push(motionSystem.alloc([
    Math.random() * columns, Math.random() * rows,
    Math.random() * columns / 10 - columns / 20, Math.random() * rows / 100 - rows / 200,
    0, 9.8,
  ]));
  motionSystem.setSlice(particles[particles.length - 1], Slice.MAX_VEL, [50]);
}

let last = Date.now();
while (true) {
  const now = Date.now();
  const dt = (now - last) / 1000;
  last = now;
  const screen = new Array(rows).fill(0).map(() => new Array(columns).fill(' '));
  motionSystem.update(dt);
  let meanYVel = 0;
  motionSystem.forEach(([dim, bank, ofs]) => {
    const { VEL } = getOfs(dim);
    meanYVel += Math.round(bank[ofs + VEL + 1]);
  });
  meanYVel /= motionSystem.size;
  motionSystem.forEach(([dim, bank, ofs]) => {
    const { POS, VEL } = getOfs(dim);
    const x = Math.round(bank[ofs + POS]);
    const y = Math.round(bank[ofs + POS + 1]);
    if (x < 0 || x > columns - 1 || y < 0 || y > rows - 1) {
      bank[ofs + POS] = Math.random() * columns;
      bank[ofs + POS + 1] = 0;
      bank[ofs + VEL] = Math.random() * columns / 10 - columns / 20;
      bank[ofs + VEL + 1] = meanYVel / 2 + Math.random() * rows / 100 - rows / 200;
    }
  });
  let ct = 0;
  motionSystem.forEach(([dim, bank, ofs]) => {
    const { POS } = getOfs(dim);
    const x = Math.round(bank[ofs + POS]);
    const y = Math.round(bank[ofs + POS + 1]);
    if (x >= 0 && x <= columns - 1 && y >= 0 && y <= rows - 1) {
      screen[y][x] = '·';
      ct++;
    }
  });
  [...String(meanYVel)].forEach((ch, i) => screen[0][i] = ch);
  process.stdout.cursorTo(0, 0);
  process.stdout.write(screen.map((column) => column.join('')).join('\n'));
  await new Promise((resolve) => setTimeout(resolve, 33));
}


