import Demitasse from '@pipobscure/demitasse';
const { describe, it, report } = Demitasse;

import Pretty from '@pipobscure/demitasse-pretty';
const { reporter } = Pretty;

import { strict as assert } from 'assert';
const { equal, ok } = assert;

import { F128 } from '../lib/float128';

describe('Float128', function () {
  describe('fromString', function () {
    it('works', function () {
      const f1 = F128.fromString('321_987654321');
      assert(f1.eq(new F128(321987654321)));

      const f2 = F128.fromString('123_123456789');
      assert(f2.eq(new F128(123_123456789)));
    });
  });

  describe('isZero', function () {
    it('works', function () {
      assert(F128[0].isZero());
      const nonzero = new F128(0.5);
      assert(!nonzero.isZero());
    });

    it('handles -0', function () {
      const negZero = new F128(-0);
      assert(negZero.isZero());
    });
  });

  describe('toBIString', function () {
    it('works', function () {
      const f1 = F128.fromString('1000000000000000000');
      equal(f1.toBIString(), '1000000000000000000');
    });
  });

  describe('trunc', function () {
    it('works', function () {
      const f1 = new F128(3.5);
      assert(f1.trunc().eq(new F128(3)));
      const f2 = new F128(-3.5);
      assert(f2.trunc().eq(new F128(-3)));
    });

    it('preserves -0', function () {
      const negZero = new F128(-0);
      assert(Object.is(negZero.trunc().toNumber(), -0));
    });
  });

  describe('integration tests', () => {
    // Adapted from the test suite of the C library that F128 came from:
    // https://github.com/BL-highprecision/QD/blob/main/tests/qd_test.cpp

    // Some constants and functions not in the library because they're not
    // needed by Temporal:
    const F128_EPSILON = new F128(4.93038065763132e-32); // 2^-104
    const F128_PI = new F128(3.141592653589793116, 1.224646799147353207e-16);
    function square(a) {
      const p = new F128(a.hi).fmul(a.hi);
      return new F128(p.hi).fadd(p.lo + 2 * a.hi * a.lo + a.lo * a.lo);
    }
    function sqrt(a) {
      // a must be positive
      const x = 1 / Math.sqrt(a.hi);
      const ax = new F128(a.hi * x);
      return ax.fadd(a.sub(square(ax)).hi * (x * 0.5));
    }
    function pow(x, n) {
      if (!Number.isInteger(n)) throw new Error('integer exponentiation required');
      if (n == 0) {
        if (x.isZero()) throw new Error('0 ** 0');
        return F128[1];
      }

      let r = new F128(x.hi, x.lo);
      let s = F128[1];
      let N = Math.abs(n);

      if (N > 1) {
        // Use binary exponentiation
        while (N > 0) {
          if (N % 2 === 1) s = s.mul(r);
          N = Math.trunc(N / 2);
          if (N > 0) r = square(r);
        }
      } else {
        s = r;
      }

      // Compute the reciprocal if n is negative
      if (n < 0) return F128[1].div(s);

      return s;
    }
    function nroot(a, n) {
      // n must be positive, and if n is even a must be nonnegative
      if (n === 1) return a;
      if (n === 2) return sqrt(a);
      if (a.isZero()) return F128[0];

      /* Note  a^{-1/n} = exp(-log(a)/n) */
      const r = a.abs();
      let x = new F128(Math.exp(-Math.log(r.hi) / n));

      /* Perform Newton's iteration. */
      x = x.add(x.mul(new F128(1).sub(r.mul(pow(x, n)))).fdiv(n));
      if (a.hi < 0) x = x.neg();
      return F128[1].div(x);
    }

    it('polynomial evaluation', () => {
      function polyeval(c, n, x) {
        /* Just use Horner's method of polynomial evaluation. */
        let r = c[n];

        for (let i = n - 1; i >= 0; i--) {
          r = r.mul(x).add(c[i]);
        }

        return r;
      }
      function polyroot(c, n, x0, maxIter = 32, thresh = F128_EPSILON) {
        let x = x0;
        const d = [];
        let conv = false;
        let maxc = Math.abs(c[0].toNumber());

        /* Compute the coefficients of the derivatives. */
        for (let i = 1; i <= n; i++) {
          const v = Math.abs(c[i].toNumber());
          if (v > maxc) maxc = v;
          d[i - 1] = c[i].fmul(i);
        }
        thresh = thresh.fmul(maxc);

        /* Newton iteration. */
        for (let i = 0; i < maxIter; i++) {
          const f = polyeval(c, n, x);

          if (f.abs().lt(thresh)) {
            conv = true;
            break;
          }
          x = x.sub(f.div(polyeval(d, n - 1, x)));
        }

        ok(conv, 'should converge');

        return x;
      }

      const n = 8;
      const c = [];

      for (let i = 0; i < n; i++) {
        c[i] = new F128(i + 1);
      }

      const x = polyroot(c, n - 1, F128[0]);
      const y = polyeval(c, n - 1, x);

      assert(y.toNumber() < 4 * F128_EPSILON.toNumber());
    });

    it("Machin's formula for pi", () => {
      function arctan(t) {
        let d = 1;
        const r = square(t);
        let result = F128[0];

        let sign = 1;
        while (t.gt(F128_EPSILON)) {
          if (sign < 0) {
            result = result.sub(t.fdiv(d));
          } else {
            result = result.add(t.fdiv(d));
          }

          d += 2;
          t = t.mul(r);
          sign = -sign;
        }
        return result;
      }

      const s1 = arctan(new F128(1).fdiv(5));
      const s2 = arctan(new F128(1).fdiv(239));
      const p = s1.fmul(4).sub(s2).fmul(4);
      const err = Math.abs(p.sub(F128_PI).toNumber());

      equal(p.toNumber(), Math.PI);
      ok(err < F128_EPSILON.fmul(8).toNumber());
    });

    it('Salamin-Brent quadratically convergent formula for pi', () => {
      const maxIter = 20;

      let a = new F128(1);
      let b = sqrt(new F128(0.5));
      equal(b.toNumber(), Math.sqrt(0.5));
      let s = new F128(0.5);
      let m = 1;

      let p = square(a).fmul(2).div(s);

      let err;
      for (let i = 1; i <= maxIter; i++) {
        m *= 2;

        const aNew = a.add(b).fmul(0.5);
        const bNew = a.mul(b);

        s = s.sub(square(aNew).sub(bNew).fmul(m));

        a = aNew;
        b = sqrt(bNew);
        const pOld = p;

        p = square(a).fmul(2).div(s);

        // Test for convergence by looking at |p - p_old|.
        err = p.sub(pOld).abs();
        if (err.cmp(new F128(1e-60)) < 0) break;
      }

      equal(p.toNumber(), Math.PI);
      ok(err.lt(F128_EPSILON.fmul(1024)));
    });

    it('Borwein quartic formula for pi', () => {
      const maxIter = 20;

      let a = new F128(6).sub(sqrt(new F128(2)).fmul(4));
      let y = sqrt(new F128(2)).fadd(-1);
      let m = 2;

      let p = new F128(1).div(a);

      let err;
      for (let i = 1; i <= maxIter; i++) {
        m *= 4;
        const r = nroot(new F128(1).sub(square(square(y))), 4);
        y = new F128(1).sub(r).div(r.fadd(1));
        a = a.mul(square(square(y.fadd(1)))).sub(y.fmul(m).mul(square(y).add(y).fadd(1)));

        const pOld = p;
        p = new F128(1).div(a);
        if (p.sub(pOld).abs().lt(F128_EPSILON.fmul(16))) {
          break;
        }
      }

      equal(p.toNumber(), Math.PI);
      err = Math.abs(p.sub(F128_PI).toNumber());
      ok(err < F128_EPSILON.fmul(128).toNumber());
    });

    it('Taylor series formula for e', () => {
      const F128_E = new F128(2.718281828459045091, 1.445646891729250158e-16);
      let s = new F128(2);
      let t = new F128(1);
      let n = 1;

      while (t.gt(F128_EPSILON)) {
        t = t.fdiv(++n);
        s = s.add(t);
      }

      const delta = Math.abs(s.sub(F128_E).toNumber());

      equal(s.toNumber(), Math.E);
      ok(delta < F128_EPSILON.fmul(64).toNumber());
    });

    it('Taylor series formula for log 2', () => {
      const F128_LOG2 = new F128(6.931471805599452862e-1, 2.319046813846299558e-17);
      let s = new F128(0.5);
      let t = new F128(0.5);
      let n = 1;

      while (t.abs().gt(F128_EPSILON)) {
        t = t.fmul(0.5);
        s = s.add(t.fdiv(++n));
      }

      const delta = Math.abs(s.sub(F128_LOG2).toNumber());

      equal(s.toNumber(), Math.log(2));
      ok(delta < F128_EPSILON.fmul(4).toNumber());
    });
  });
});

import { normalize } from 'path';
if (normalize(import.meta.url.slice(8)) === normalize(process.argv[1])) {
  report(reporter).then((failed) => process.exit(failed ? 1 : 0));
}
