/* Mission Maths — repere.js
   Module Repère SVG (lot 4a) : un repère gradué de −6 à 6 sur les deux axes (D91), une grille, des points nommés, des droites.
   Pour placer un point au toucher, la page lit la position du toucher dans le dessin et appelle accroche() : le point va au nœud
   le plus proche, sans jamais sortir du cadre. Le point en cours de placement est dessiné sans ses coordonnées (D90).
   Fonctions pures : elles rendent du texte SVG, sans accès à l'écran. Les couleurs viennent des variables CSS de la page. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  const FEN = { min: -6, max: 6 };
  const VUE = 320, MARGE = 16, N = FEN.max - FEN.min, UNITE = (VUE - 2 * MARGE) / N;
  const MOINS = "−";
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const r2 = v => Math.round(v * 100) / 100;
  const nombre = k => (k < 0 ? MOINS + (-k) : String(k));

  /* Coordonnées du repère → coordonnées du dessin (l'axe des y monte). */
  function versVue(x, y) { return [MARGE + (x - FEN.min) * UNITE, MARGE + (FEN.max - y) * UNITE]; }
  /* Un toucher (coordonnées du dessin) → le nœud entier le plus proche, dans le cadre. */
  function accroche(px, py) {
    const borne = v => Math.min(FEN.max, Math.max(FEN.min, v));
    const x = borne(Math.round((px - MARGE) / UNITE + FEN.min)), y = borne(Math.round(FEN.max - (py - MARGE) / UNITE));
    return { x: x === 0 ? 0 : x, y: y === 0 ? 0 : y };                   // jamais −0
  }
  /* La partie visible de y = mx + b : deux bouts [x, y], de gauche à droite ; null si la droite ne traverse pas le cadre. */
  function coupe(m, b) {
    const pts = [];
    const ajoute = (x, y) => { if (x >= FEN.min - 1e-9 && x <= FEN.max + 1e-9 && y >= FEN.min - 1e-9 && y <= FEN.max + 1e-9 && !pts.some(p => Math.abs(p[0] - x) < 1e-9)) pts.push([x, y]); };
    ajoute(FEN.min, m * FEN.min + b); ajoute(FEN.max, m * FEN.max + b);
    if (m !== 0) for (const y of [FEN.min, FEN.max]) ajoute((y - b) / m, y);
    if (pts.length < 2) return null;
    pts.sort((a, c) => a[0] - c[0]);
    return [pts[0], pts[pts.length - 1]];
  }

  /* opts : { points: [{ nom, x, y, cls }], droites: [{ m, b, cls }], candidat: { nom, x, y } | null, interactif, titre } */
  function svg(opts) {
    const o = opts || {}, out = [];
    const [x0, y0] = versVue(FEN.min, FEN.max), [x1, y1] = versVue(FEN.max, FEN.min), [ox, oy] = versVue(0, 0);
    out.push(`<svg class="repere${o.interactif ? " actif" : ""}" viewBox="0 0 ${VUE} ${VUE}" role="img" aria-label="${esc(o.titre || "Repère gradué de −6 à 6")}"${o.interactif ? " data-repere" : ""} xmlns="http://www.w3.org/2000/svg">`);
    // la grille, puis les axes avec leurs flèches
    out.push(`<g class="grille">`);
    for (let k = FEN.min; k <= FEN.max; k++) { if (!k) continue; const [x] = versVue(k, 0), [, y] = versVue(0, k); out.push(`<line x1="${r2(x)}" y1="${r2(y0)}" x2="${r2(x)}" y2="${r2(y1)}"/><line x1="${r2(x0)}" y1="${r2(y)}" x2="${r2(x1)}" y2="${r2(y)}"/>`); }
    out.push(`</g><g class="axes">`);
    out.push(`<line x1="${r2(x0 - 8)}" y1="${r2(oy)}" x2="${r2(x1 + 10)}" y2="${r2(oy)}"/><path d="M${r2(x1 + 12)} ${r2(oy)}l-8 -4v8z"/>`);
    out.push(`<line x1="${r2(ox)}" y1="${r2(y1 + 8)}" x2="${r2(ox)}" y2="${r2(y0 - 10)}"/><path d="M${r2(ox)} ${r2(y0 - 12)}l-4 8h8z"/>`);
    out.push(`</g><g class="grad">`);
    for (let k = FEN.min; k <= FEN.max; k++) {
      if (!k) continue;
      const [x] = versVue(k, 0), [, y] = versVue(0, k);
      out.push(`<text x="${r2(x)}" y="${r2(oy + 13)}" text-anchor="middle">${nombre(k)}</text>`);
      out.push(`<text x="${r2(ox - 4)}" y="${r2(y + 4)}" text-anchor="end">${nombre(k)}</text>`);
    }
    out.push(`<text x="${r2(ox - 4)}" y="${r2(oy + 13)}" text-anchor="end">O</text><text class="nomaxe" x="${r2(x1 + 4)}" y="${r2(oy - 6)}" text-anchor="end">x</text><text class="nomaxe" x="${r2(ox + 6)}" y="${r2(y0 - 2)}">y</text>`);
    out.push(`</g>`);
    for (const d of o.droites || []) {
      const c = coupe(d.m, d.b); if (!c) continue;
      const [a, b] = c.map(p => versVue(p[0], p[1]));
      out.push(`<line class="droite${d.cls ? " " + esc(d.cls) : ""}" x1="${r2(a[0])}" y1="${r2(a[1])}" x2="${r2(b[0])}" y2="${r2(b[1])}"/>`);
    }
    // le nom du point : à droite (à gauche près du bord), au-dessus si y ≥ 0, en dessous sinon (les graduations de l'axe des x sont juste sous l'axe)
    const point = (p, cls) => { const [x, y] = versVue(p.x, p.y), droite = p.x < FEN.max - 1, dy = p.y < 0 ? 18 : -8;
      return `<g class="${cls}"><circle cx="${r2(x)}" cy="${r2(y)}" r="${cls === "candidat" ? 7 : 5.5}"/>${p.nom ? `<text x="${r2(x + (droite ? 9 : -9))}" y="${r2(y + dy)}" text-anchor="${droite ? "start" : "end"}">${esc(p.nom)}</text>` : ""}</g>`; };
    for (const p of o.points || []) out.push(point(p, "pt" + (p.cls ? " " + esc(p.cls) : "")));
    if (o.candidat) out.push(point(o.candidat, "candidat"));
    out.push(`</svg>`);
    return out.join("");
  }

  MM.repere = { FEN, VUE, MARGE, UNITE, versVue, accroche, coupe, svg };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
