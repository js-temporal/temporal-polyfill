// Adapted from a paper and the accompanying code:
// Hida, Li, Bailey (2008). Library for double-double and quad-double arithmetic
// https://github.com/BL-highprecision/QD

const NDIGITS = 31;

export class F128 {
  readonly hi: number;
  readonly lo: number;
  constructor(hi = 0, lo = 0) {
    this.hi = hi;
    this.lo = lo;
  }

  static [0] = new F128(0);
  static [1] = new F128(1);
  static [10] = new F128(10);

  static fromString(s: string) {
    let sign = 0;
    let point = -1;
    let nd = 0;
    let e = 0;
    let done = false;
    let r = F128[0];

    // Skip any leading spaces
    let p = [...s.trimStart()];

    let ch;
    while (!done && (ch = p.shift())) {
      switch (ch) {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          r = r.fmul(10).fadd(parseInt(ch, 10));
          nd++;
          break;

        case '.':
          if (point >= 0) throw new Error('multiple decimal points');
          point = nd;
          break;

        case '-':
        case '+':
          if (sign !== 0 || nd > 0) throw new Error('multiple signs');
          sign = ch == '-' ? -1 : 1;
          break;

        case 'E':
        case 'e':
          e = parseInt(p.join(''), 10);
          done = true;
          if (Number.isNaN(e)) throw new Error('invalid exponent');
          break;

        case '_': // numeric separator
          break;

        default:
          throw new Error('unrecognized character');
      }
    }

    if (point >= 0) {
      e -= nd - point;
    }

    if (e > 0) {
      r = r.mul(F128.fromString('1' + '0'.repeat(e)));
    } else if (e < 0) {
      r = r.div(F128.fromString('1' + '0'.repeat(e)));
    }

    return sign == -1 ? r.neg() : r;
  }

  abs() {
    return this.hi < 0 ? this.neg() : this;
  }

  add(other: F128) {
    let s = twoSum(this.hi, other.hi);
    const t = twoSum(this.lo, other.lo);
    s = quickTwoSum(s.hi, s.lo + t.hi);
    return quickTwoSum(s.hi, s.lo + t.lo);
  }

  fadd(other: number) {
    const s = twoSum(this.hi, other);
    return quickTwoSum(s.hi, s.lo + this.lo);
  }

  cmp(other: F128) {
    return (this.sub(other).sign() + 0) as -1 | 0 | 1;
  }

  div(other: F128) {
    let q1 = this.hi / other.hi; // approximate quotient

    let r = this.sub(other.fmul(q1));

    let q2 = r.hi / other.hi;
    r = r.sub(other.fmul(q2));

    const q3 = r.hi / other.hi;

    return quickTwoSum(q1, q2).fadd(q3);
  }

  fdiv(other: number) {
    const q1 = this.hi / other; // approximate quotient

    // Compute this - q1 * d
    const p = twoProd(q1, other);
    const s = twoDiff(this.hi, p.hi);

    // get next approximation
    const q2 = (s.hi + s.lo + this.lo - p.lo) / other;

    // renormalize
    return quickTwoSum(q1, q2);
  }

  eq(other: F128) {
    return this.hi === other.hi && this.lo === other.lo;
  }

  geq(other: F128) {
    return this.hi > other.hi || (this.hi === other.hi && this.lo >= other.lo);
  }

  gt(other: F128) {
    return this.hi > other.hi || (this.hi === other.hi && this.lo > other.lo);
  }

  isEvenInt() {
    return this.fdiv(2).trunc().fmul(2).eq(this);
  }

  isZero() {
    return this.hi === 0;
  }

  leq(other: F128) {
    return this.hi < other.hi || (this.hi === other.hi && this.lo <= other.lo);
  }

  lt(other: F128) {
    return this.hi < other.hi || (this.hi === other.hi && this.lo < other.lo);
  }

  mul(other: F128) {
    const p = twoProd(this.hi, other.hi);
    return quickTwoSum(p.hi, p.lo + this.hi * other.lo + this.lo * other.hi);
  }

  fmul(other: number) {
    const p = twoProd(this.hi, other);
    return quickTwoSum(p.hi, p.lo + this.lo * other);
  }

  neg() {
    return new F128(-this.hi, -this.lo);
  }

  round(mode: 'ceil' | 'floor') {
    let hi = Math[mode](this.hi);
    if (hi !== this.hi) return new F128(hi);
    // High word is integer already. Round the low word.
    const lo = Math[mode](this.lo);
    return quickTwoSum(hi, lo);
  }

  sign() {
    return Math.sign(this.hi) as -1 | -0 | 0 | 1;
  }

  sub(other: F128) {
    const s = twoDiff(this.hi, other.hi);
    return quickTwoSum(s.hi, s.lo + this.lo - other.lo);
  }

  toInt() {
    return this.trunc().toNumber() + 0;
  }

  toNumber() {
    return this.hi;
  }

  toBIString() {
    if (Number.isNaN(this.hi) || Number.isNaN(this.lo)) throw new Error('NaN');
    if (!Number.isFinite(this.hi)) throw new Error('infinity');
    if (this.isZero()) return '0';

    const D = NDIGITS + 2; // number of digits to compute

    // First determine the (approximate) exponent
    let e = Math.floor(Math.log10(Math.abs(this.hi)));
    if (e < 0 || e > NDIGITS + 1) throw new Error('not an integer');

    let r = this.abs().div(F128.fromString('1' + '0'.repeat(e)));

    // Fix exponent if we are off by one
    if (r.geq(F128[10])) {
      r = r.fdiv(10);
      e++;
    } else if (r.lt(F128[1])) {
      r = r.fmul(10);
      e--;
    }

    if (r.geq(F128[10]) || r.lt(F128[1])) throw new Error("can't compute exponent");

    // Extract the digits
    let digits: number[] = [];
    for (let i = 0; i < D; i++) {
      const d = Math.trunc(r.hi) + 0;
      r = r.fadd(-d);
      r = r.fmul(10);

      digits.push(d);
    }

    // Fix out of range digits
    for (let i = D - 1; i > 0; i--) {
      if (digits[i] < 0) {
        digits[i - 1]--;
        digits[i] += 10;
      } else if (digits[i] > 9) {
        digits[i - 1]++;
        digits[i] -= 10;
      }
    }

    if (digits[0] <= 0) throw new Error('non-positive leading digit');

    // Round, handle carry
    if (digits[D - 1] >= 5) {
      digits[D - 2]++;

      let i = D - 2;
      while (i > 0 && digits[i] > 9) {
        digits[i] -= 10;
        digits[--i]++;
      }
    }

    // If first digit is 10, shift everything
    if (digits[0] > 9) {
      e++;
      digits.splice(0, 1, 1, 0);
    }

    const t = digits
      .slice(0, NDIGITS + 1)
      .map((d) => d.toString(10))
      .join('');

    let s = '';
    const sign = this.sign();
    if (sign === -1 || Object.is(sign, -0)) {
      s += '-';
    }

    if (e < NDIGITS + 1) return s + t.slice(0, e + 1);

    throw new Error('not an integer');
  }

  trunc() {
    if (Object.is(this.hi, -0)) return new F128(-0);
    return this.round(this.hi >= 0 ? 'floor' : 'ceil');
  }
}

/** Computes precise a+b of two float64s.  Assumes |a| >= |b|. */
function quickTwoSum(a: number, b: number) {
  const s = a + b;
  const err = b - (s - a);
  return new F128(s, err);
}

/** Computes precise a+b of two float64s. */
function twoSum(a: number, b: number) {
  const s = a + b;
  const bb = s - a;
  const err = a - (s - bb) + (b - bb);
  return new F128(s, err);
}

/** Computes precise a-b of two float64s.  */
function twoDiff(a: number, b: number) {
  const s = a - b;
  const bb = s - a;
  const err = a - (s - bb) - (b + bb);
  return new F128(s, err);
}

const _QD_SPLITTER = 134217729; // = 2^27 + 1
const _QD_SPLIT_THRESH = 6.69692879491417e299; // = 2^996
/** Computes high word and low word of a */
function split(a: number) {
  let hi, lo;
  if (a > _QD_SPLIT_THRESH || a < -_QD_SPLIT_THRESH) {
    const scaled = a * 3.7252902984619140625e-9; // 2^-28
    const temp = _QD_SPLITTER * scaled;
    hi = temp - (temp - scaled);
    lo = scaled - hi;
    hi *= 268435456; // 2^28
    lo *= 268435456; // 2^28
  } else {
    const temp = _QD_SPLITTER * a;
    hi = temp - (temp - a);
    lo = a - hi;
  }
  return new F128(hi, lo);
}

/** Computes precise a*b of two float64s. */
function twoProd(a: number, b: number) {
  const p = a * b;
  const aa = split(a);
  const bb = split(b);
  const err = aa.hi * bb.hi - p + aa.hi * bb.lo + aa.lo * bb.hi + aa.lo * bb.lo;
  return new F128(p, err);
}
