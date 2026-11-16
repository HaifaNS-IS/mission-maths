/* Mission Maths — outils.js : hasard reproductible (graine), empreinte SHA-256, identifiants. Sans accès à l'écran. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});

  /* Générateur pseudo-aléatoire mulberry32 : même graine, même suite, sur tous les appareils. */
  function melanger(h) {                       // finaliseur de murmur3 : deux graines voisines donnent des suites sans rapport
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  }
  function alea(graine) {
    let a = melanger((graine >>> 0) ^ 0x9E3779B9);
    const suivant = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const entier = (min, max) => min + Math.floor(suivant() * (max - min + 1));
    return {
      suivant, entier,
      choix: liste => liste[Math.floor(suivant() * liste.length)],
      signe: () => (suivant() < 0.5 ? -1 : 1),
      nonNul: (min, max) => { let v = 0; while (v === 0) v = entier(min, max); return v; }
    };
  }
  const nouvelleGraine = () => (Math.floor(Math.random() * 0x7fffffff) + 1) >>> 0;

  /* SHA-256 en JavaScript pur : même résultat partout, sans dépendre du navigateur. */
  function sha256(texte) {
    const K = [], H = [];
    const estPremier = n => { for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
    const frac = x => ((x - Math.floor(x)) * 4294967296) >>> 0;
    for (let n = 2; K.length < 64; n++) if (estPremier(n)) { if (H.length < 8) H.push(frac(Math.sqrt(n))); K.push(frac(Math.cbrt(n))); }
    const oct = [];
    for (const ch of unescape(encodeURIComponent(String(texte)))) oct.push(ch.charCodeAt(0));
    const bits = oct.length * 8;
    oct.push(0x80);
    while (oct.length % 64 !== 56) oct.push(0);
    for (let i = 7; i >= 0; i--) oct.push(i >= 4 ? (Math.floor(bits / 4294967296) >>> ((i - 4) * 8)) & 255 : (bits >>> (i * 8)) & 255);
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    const w = new Array(64);
    for (let o = 0; o < oct.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = ((oct[o + 4 * i] << 24) | (oct[o + 4 * i + 1] << 16) | (oct[o + 4 * i + 2] << 8) | oct[o + 4 * i + 3]) >>> 0;
      for (let i = 16; i < 64; i++) {
        const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
        const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      [a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) >>> 0; });
    }
    return H.map(v => v.toString(16).padStart(8, "0")).join("");
  }

  /* Identifiant unique, triable par date, valable comme nom de document. */
  let compteur = 0;
  const uid = prefixe => (prefixe || "") + Date.now().toString(36) + "-" + (compteur++).toString(36) + Math.floor(Math.random() * 1679616).toString(36).padStart(4, "0");

  /* Fusion en profondeur, comme l'« update » de la base : les objets se fusionnent, le reste remplace. */
  function fusionner(cible, source) {
    for (const k of Object.keys(source)) {
      const v = source[k];
      if (v && typeof v === "object" && !Array.isArray(v) && cible[k] && typeof cible[k] === "object" && !Array.isArray(cible[k])) fusionner(cible[k], v);
      else cible[k] = v && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v;
    }
    return cible;
  }

  MM.outils = { alea, nouvelleGraine, sha256, uid, fusionner };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
