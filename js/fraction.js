/* Mission Maths — fraction.js
   Arithmétique exacte sur les fractions (BigInt). Aucun nombre à virgule flottante ne sert à juger une réponse. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});

  function pgcd(a, b) {
    if (a < 0n) a = -a;
    if (b < 0n) b = -b;
    while (b) { const r = a % b; a = b; b = r; }
    return a;
  }

  class Fraction {
    constructor(n, d) {
      n = BigInt(n); d = d === undefined ? 1n : BigInt(d);
      if (d === 0n) throw new RangeError("division par zéro");
      if (d < 0n) { n = -n; d = -d; }
      const g = pgcd(n, d) || 1n;
      this.n = n / g; this.d = d / g;
      Object.freeze(this);
    }
    /* Accepte : Fraction, entier JS, BigInt, "3", "-3/4", "0.25", "0,25". */
    static de(v) {
      if (v instanceof Fraction) return v;
      if (typeof v === "bigint") return new Fraction(v);
      if (typeof v === "number") {
        if (!Number.isInteger(v)) throw new TypeError("Fraction.de : nombre non entier, passer une chaîne");
        return new Fraction(BigInt(v));
      }
      if (typeof v === "string") {
        const s = v.trim().replace(/−/g, "-").replace(",", ".");
        let m = /^([+-]?\d+)\/([+-]?\d+)$/.exec(s);
        if (m) return new Fraction(BigInt(m[1]), BigInt(m[2]));
        m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(s);
        if (m) {
          const dec = m[3] || "";
          const f = new Fraction(BigInt(m[2] + dec), 10n ** BigInt(dec.length));
          return m[1] === "-" ? f.oppose() : f;
        }
      }
      throw new TypeError("Fraction.de : valeur illisible : " + String(v));
    }
    plus(o) { o = Fraction.de(o); return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d); }
    moins(o) { o = Fraction.de(o); return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d); }
    fois(o) { o = Fraction.de(o); return new Fraction(this.n * o.n, this.d * o.d); }
    sur(o) { o = Fraction.de(o); if (o.n === 0n) throw new RangeError("division par zéro"); return new Fraction(this.n * o.d, this.d * o.n); }
    oppose() { return new Fraction(-this.n, this.d); }
    abs() { return this.n < 0n ? this.oppose() : this; }
    egal(o) { o = Fraction.de(o); return this.n === o.n && this.d === o.d; }
    cmp(o) { o = Fraction.de(o); const x = this.n * o.d - o.n * this.d; return x < 0n ? -1 : x > 0n ? 1 : 0; }
    signe() { return this.n < 0n ? -1 : this.n > 0n ? 1 : 0; }
    estNul() { return this.n === 0n; }
    estEntier() { return this.d === 1n; }
    /* Clé ASCII stable, pour le stockage et les comparaisons : "-1/4", "3". */
    cle() { return this.d === 1n ? String(this.n) : this.n + "/" + this.d; }
    /* Écriture affichée : signe moins typographique, fraction "1/4". */
    texte() { return this.cle().replace("-", "−"); }
    /* Écriture décimale exacte avec virgule, ou null si elle ne se termine pas (1/3). */
    decimal() {
      let d = this.d, k = 0;
      while (d % 2n === 0n) { d /= 2n; k++; }
      let k5 = 0;
      while (d % 5n === 0n) { d /= 5n; k5++; }
      if (d !== 1n) return null;
      const p = Math.max(k, k5);
      const num = (this.n < 0n ? -this.n : this.n) * 10n ** BigInt(p) / this.d;
      let s = num.toString().padStart(p + 1, "0");
      if (p) s = s.slice(0, -p) + "," + s.slice(-p);
      return (this.n < 0n ? "−" : "") + s;
    }
    /* Valeur approchée : affichage et dessin uniquement, jamais pour juger. */
    approx() { return Number(this.n) / Number(this.d); }
    /* Racine carrée exacte si le nombre est un carré parfait de fraction, sinon null. */
    racine() {
      if (this.n < 0n) return null;
      const r = v => { if (v < 2n) return v; let x = BigInt(Math.floor(Math.sqrt(Number(v)))); while (x * x > v) x--; while ((x + 1n) * (x + 1n) <= v) x++; return x * x === v ? x : null; };
      const a = r(this.n), b = r(this.d);
      return a === null || b === null ? null : new Fraction(a, b);
    }
    toString() { return this.cle(); }
    toJSON() { return this.cle(); }
  }
  Fraction.ZERO = new Fraction(0n);
  Fraction.UN = new Fraction(1n);

  MM.Fraction = Fraction;
  MM.F = v => Fraction.de(v);
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
