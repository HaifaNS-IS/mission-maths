/* Mission Maths — expr.js
   Lecture d'une ligne tapée par l'élève : texte → arbre → polynôme en x (coefficients exacts)
   et → liste de termes (structure visible : parenthèses, ordre). Sans accès à l'écran. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function" && !MM.Fraction) require("./fraction.js");
  const Fraction = MM.Fraction, F = MM.F;

  class ErreurLecture extends Error {
    constructor(code, info) { super(code); this.name = "ErreurLecture"; this.code = code; this.info = info || null; }
  }

  /* ---------- normalisation : tout ce qui s'écrit pareil sur une copie se lit pareil ---------- */
  function normaliser(s) {
    return String(s == null ? "" : s)
      .replace(/[\s  -​  　]/g, "")
      .replace(/[−‐‑‒–—﹣－]/g, "-")
      .replace(/[×·∙⋅✕*]/g, "*")
      .replace(/[÷:]/g, "/")
      .replace(/²/g, "^2").replace(/³/g, "^3")
      .replace(/X/g, "x")
      .replace(/,/g, ".");
  }

  function jetons(s) {
    const out = []; let i = 0;
    const chiffre = c => c >= "0" && c <= "9";
    while (i < s.length) {
      const c = s[i];
      if (chiffre(c)) {
        let j = i; while (j < s.length && chiffre(s[j])) j++;
        if (s[j] === ".") {
          let k = j + 1; while (k < s.length && chiffre(s[k])) k++;
          if (k === j + 1 || s[k] === ".") throw new ErreurLecture("nombre");
          j = k;
        }
        out.push({ t: "num", v: s.slice(i, j) }); i = j; continue;
      }
      if (c === "x") { out.push({ t: "x" }); i++; continue; }
      if ("+-*/^()".includes(c)) { out.push({ t: c }); i++; continue; }
      if (c === ".") throw new ErreurLecture("nombre");
      throw new ErreurLecture("symbole", { symbole: c });
    }
    return out;
  }

  /* expr := terme (± terme)* ; terme := facteur ((*|/) facteur | facteur implicite)* ;
     facteur := ± facteur | puissance ; puissance := atome (^ entier)? ; atome := nombre | x | ( expr ) */
  function analyser(tok) {
    let p = 0;
    const est = t => p < tok.length && tok[p].t === t;
    function expr() {
      let a = terme();
      while (est("+") || est("-")) { const op = tok[p++].t; const b = terme(); a = { t: op === "+" ? "add" : "sub", a, b }; }
      return a;
    }
    function terme() {
      let a = facteur();
      for (;;) {
        if (est("*")) { p++; a = { t: "mul", a, b: facteur() }; }
        else if (est("/")) { p++; a = { t: "div", a, b: facteur() }; }
        else if (est("x") || est("(")) a = { t: "mul", a, b: puissance() };
        else if (est("num")) throw new ErreurLecture("ordre");
        else break;
      }
      return a;
    }
    function facteur() {
      if (est("-")) { p++; return { t: "neg", a: facteur() }; }
      if (est("+")) { p++; return facteur(); }
      return puissance();
    }
    function puissance() {
      const a = atome();
      if (est("^")) {
        p++;
        if (!est("num") || !/^\d+$/.test(tok[p].v) || Number(tok[p].v) > 4) throw new ErreurLecture("exposant");
        return { t: "pow", a, n: Number(tok[p++].v) };
      }
      return a;
    }
    function atome() {
      const k = tok[p];
      if (!k) throw new ErreurLecture("incomplet");
      if (k.t === "num") { p++; return { t: "num", v: F(k.v), brut: k.v }; }
      if (k.t === "x") { p++; return { t: "x" }; }
      if (k.t === "(") {
        p++;
        if (est(")")) throw new ErreurLecture("parenthese-vide");
        const a = expr();
        if (!est(")")) throw new ErreurLecture("parenthese");
        p++; return { t: "grp", a };
      }
      if (k.t === ")") throw new ErreurLecture("parenthese");
      throw new ErreurLecture("incomplet");
    }
    if (!tok.length) throw new ErreurLecture("vide");
    const a = expr();
    if (p < tok.length) throw new ErreurLecture(tok[p].t === ")" ? "parenthese" : "incomplet");
    return a;
  }

  /* ---------- polynôme en x, coefficients exacts ---------- */
  class Poly {
    constructor(c) {
      const a = c.map(F);
      while (a.length && a[a.length - 1].estNul()) a.pop();
      this.c = Object.freeze(a); Object.freeze(this);
    }
    static cst(v) { return new Poly([F(v)]); }
    static xn(n) { const a = []; for (let i = 0; i < n; i++) a.push(Fraction.ZERO); a.push(Fraction.UN); return new Poly(a); }
    degre() { return this.c.length - 1; }                 // −1 pour le polynôme nul
    coef(k) { return this.c[k] || Fraction.ZERO; }
    estNul() { return this.c.length === 0; }
    plus(o) { const n = Math.max(this.c.length, o.c.length), a = []; for (let i = 0; i < n; i++) a.push(this.coef(i).plus(o.coef(i))); return new Poly(a); }
    moins(o) { return this.plus(o.echelle(-1)); }
    echelle(k) { k = F(k); return new Poly(this.c.map(v => v.fois(k))); }
    fois(o) {
      if (this.estNul() || o.estNul()) return new Poly([]);
      const a = []; for (let i = 0; i < this.c.length + o.c.length - 1; i++) a.push(Fraction.ZERO);
      this.c.forEach((u, i) => o.c.forEach((v, j) => { a[i + j] = a[i + j].plus(u.fois(v)); }));
      return new Poly(a);
    }
    egal(o) { return this.c.length === o.c.length && this.c.every((v, i) => v.egal(o.c[i])); }
    valeur(x) { x = F(x); let r = Fraction.ZERO; for (let i = this.c.length - 1; i >= 0; i--) r = r.fois(x).plus(this.c[i]); return r; }
    cle() { return this.c.map(v => v.cle()).join(";") || "0"; }
  }

  function polyDe(n) {
    switch (n.t) {
      case "num": return Poly.cst(n.v);
      case "x": return Poly.xn(1);
      case "neg": return polyDe(n.a).echelle(-1);
      case "grp": return polyDe(n.a);
      case "add": return polyDe(n.a).plus(polyDe(n.b));
      case "sub": return polyDe(n.a).moins(polyDe(n.b));
      case "mul": return polyDe(n.a).fois(polyDe(n.b));
      case "div": {
        const d = polyDe(n.b);
        if (d.degre() > 0) throw new ErreurLecture("division-x");
        if (d.estNul()) throw new ErreurLecture("division-zero");
        return polyDe(n.a).echelle(Fraction.UN.sur(d.coef(0)));
      }
      case "pow": { let r = Poly.cst(1); const b = polyDe(n.a); for (let i = 0; i < n.n; i++) r = r.fois(b); return r; }
    }
    throw new ErreurLecture("incomplet");
  }

  /* ---------- termes : la structure visible d'un côté d'une ligne ----------
     Terme = { c, d, inner, simple, opaque }
       c      coefficient (Fraction)        d  degré de x dans le facteur
       inner  null pour un monôme, sinon la liste des termes de LA parenthèse multipliée
       simple monôme écrit avec au plus un nombre (ou une fraction a/b) et au plus un x
       opaque produit de plusieurs parenthèses : développé d'office, aucune erreur type n'y est cherchée */
  const mono = (c, d) => ({ c: F(c), d: d || 0, inner: null, simple: true, opaque: false });
  const par = (c, inner, d) => ({ c: F(c), d: d || 0, inner, simple: false, opaque: false });
  function monomes(p) {
    const out = [];
    for (let k = p.degre(); k >= 0; k--) if (!p.coef(k).estNul()) out.push(mono(p.coef(k), k));
    return out.length ? out : [mono(0, 0)];
  }
  const sansGrp = n => { while (n.t === "grp") n = n.a; return n; };
  const estSomme = n => { n = sansGrp(n); return n.t === "add" || n.t === "sub"; };

  function termesDe(ast) {
    const out = [];
    (function somme(n, s) {
      if (n.t === "add") { somme(n.a, s); somme(n.b, s); }
      else if (n.t === "sub") { somme(n.a, s); somme(n.b, -s); }
      else if (n.t === "grp" && estSomme(n) && s === 1) somme(sansGrp(n), 1);   // « + ( … ) » : parenthèses sans effet
      else out.push(produit(n, s));
    })(ast, 1);
    return out;
  }
  function produit(n0, s) {
    let c = F(s), d = 0, nNum = 0, nDen = 0, nX = 0, haut = null, bas = null;
    const groupes = [];
    const cst = (v, inv) => {
      if (inv) { if (v.estNul()) throw new ErreurLecture("division-zero"); c = c.sur(v); nDen++; bas = v; }
      else { c = c.fois(v); nNum++; haut = v; }
    };
    (function fact(n, inv) {
      switch (n.t) {
        case "num": cst(n.v, inv); break;
        case "x": if (inv) throw new ErreurLecture("division-x"); d += 1; nX++; break;
        case "neg": c = c.oppose(); fact(n.a, inv); break;
        case "mul": fact(n.a, inv); fact(n.b, inv); break;
        case "div": fact(n.a, inv); fact(n.b, !inv); break;
        case "pow": {
          if (sansGrp(n.a).t === "x") { if (inv) throw new ErreurLecture("division-x"); d += n.n; nX++; break; }
          const p = polyDe(n);
          if (p.degre() <= 0) { cst(p.coef(0), inv); nNum++; break; }           // (−3)² : un calcul pas encore fait
          if (inv) throw new ErreurLecture("division-x");
          groupes.push({ poly: p, opaque: true }); break;
        }
        case "grp": {
          const a = sansGrp(n);
          if (a.t === "add" || a.t === "sub") {
            if (inv) {
              const p = polyDe(a);
              if (p.degre() > 0) throw new ErreurLecture("division-x");
              cst(p.coef(0), true); nDen++;
            } else groupes.push({ ast: a });
          } else fact(a, inv);                                                    // (−7), (3x) : un seul terme entre parenthèses
          break;
        }
      }
    })(n0, false);
    if (!groupes.length) {
      const simple = nNum <= 1 && nDen <= 1 && nX <= 1;
      // « 6/8 » : fraction juste mais pas simplifiée (ou division entière pas faite)
      return { c, d, inner: null, simple, opaque: false, aSimplifier: simple && nDen === 1 && nNum === 1 && haut.estEntier() && bas.estEntier() && new Fraction(haut.n, bas.n).d !== bas.abs().n };
    }
    if (groupes.length === 1 && !groupes[0].opaque) {
      let inner = termesDe(groupes[0].ast);
      if (inner.some(t => t.inner)) inner = monomes(polyDe(groupes[0].ast));      // parenthèses imbriquées : intérieur aplati
      return { c, d, inner, simple: false, opaque: false };
    }
    let p = Poly.cst(c).fois(Poly.xn(d));
    for (const g of groupes) p = p.fois(g.poly || polyDe(g.ast));
    return { c: Fraction.UN, d: 0, inner: monomes(p), simple: false, opaque: true };
  }

  function polyDeTermes(ts) {
    let p = new Poly([]);
    for (const t of ts) {
      const f = Poly.cst(t.c).fois(Poly.xn(t.d));
      p = p.plus(t.inner ? f.fois(polyDeTermes(t.inner)) : f);
    }
    return p;
  }

  /* ---------- écriture affichée (signe moins typographique, espaces autour des opérations) ---------- */
  const MOINS = "−";
  const xn = d => d === 0 ? "" : d === 1 ? "x" : d === 2 ? "x²" : "x^" + d;
  function corps(t) {                       // le terme sans son signe
    const a = t.c.abs();
    if (t.inner) {
      const k = a.egal(1) && t.d === 0 ? "" : (a.egal(1) ? "" : a.estEntier() ? a.texte() : "(" + a.texte() + ")") + xn(t.d);
      return k + "(" + ecrireCote(t.inner) + ")";
    }
    if (t.d === 0) return a.texte();
    if (a.egal(1)) return xn(t.d);
    return (a.estEntier() ? a.texte() : "(" + a.texte() + ")") + xn(t.d);
  }
  function ecrireTerme(t) { return (t.c.signe() < 0 ? MOINS : "") + corps(t); }
  function ecrireCote(ts) {
    if (!ts.length) return "0";
    return ts.map((t, i) => {
      const neg = t.c.signe() < 0;
      return i === 0 ? (neg ? MOINS : "") + corps(t) : (neg ? " " + MOINS + " " : " + ") + corps(t);
    }).join("");
  }
  const ecrireEquation = e => ecrireCote(e.g) + " = " + ecrireCote(e.d);

  /* ---------- points d'entrée ---------- */
  function lireExpression(texte) {
    const s = normaliser(texte);
    if (s.includes("=")) throw new ErreurLecture("egal-en-trop");
    const ast = analyser(jetons(s));
    const termes = termesDe(ast);
    return { termes, poly: polyDe(ast) };
  }
  function lireEquation(texte) {
    const s = normaliser(texte);
    if (!s) throw new ErreurLecture("vide");
    const parts = s.split("=");
    if (parts.length < 2) throw new ErreurLecture("egal-manquant");
    if (parts.length > 2) throw new ErreurLecture("egal-multiple");
    if (!parts[0] || !parts[1]) throw new ErreurLecture("incomplet");
    const a = analyser(jetons(parts[0])), b = analyser(jetons(parts[1]));
    return { g: termesDe(a), d: termesDe(b) };
  }

  MM.ErreurLecture = ErreurLecture;
  MM.Poly = Poly;
  MM.expr = { normaliser, lireExpression, lireEquation, polyDeTermes, monomes, mono, par, ecrireCote, ecrireTerme, ecrireEquation, MOINS };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
