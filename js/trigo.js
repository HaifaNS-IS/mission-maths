/* Mission Maths — trigo.js
   Lot express du 29/11 : la fiche trigo dans l'app (G7). Pas d'exercice jugé : une méthode, des triangles dessinés,
   et 7 exercices dont le corrigé se déplie. Aucune valeur n'est écrite à la main : chaque résultat est calculé ici
   (fonctions du navigateur, en degrés), puis arrondi au centième.
   Un triangle : X l'angle aigu étudié, R l'angle droit, Y le troisième sommet.
     adjacent = [XR], opposé = [RY], hypoténuse = [XY]. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  const RAD = Math.PI / 180, MOINS = "−";
  const virgule = t => t.replace("-", MOINS).replace(".", ",");
  /* Arrondi au centième, écrit à la française : 6,88 ; 13 ; 0,5. exact : le nombre tombe juste. */
  function nombre(x) {
    const r = Math.round(x * 100) / 100, exact = Math.abs(x - r) < 1e-9;
    return { texte: virgule(String(r)), exact };
  }
  const egal = (x, signe) => (x.exact ? " = " : " ≈ ") + x.texte + (signe || "");
  const chapeau = s => (s + "\u0302").normalize("NFC");                       // Â (un seul caractère), D̂ (lettre + accent)

  /* Les 7 exercices de la fiche : seulement des données, le reste est calculé. */
  const EXOS = [
    { tri: ["A", "B", "C"], cotes: { adj: 6, hyp: 10 }, cherche: "angle" },
    { tri: ["A", "B", "C"], angle: 35, cotes: { hyp: 12 }, cherche: "opp" },
    { tri: ["A", "B", "C"], angle: 40, cotes: { adj: 8 }, cherche: "opp" },
    { tri: ["A", "B", "C"], angle: 52, cotes: { adj: 5 }, cherche: "hyp" },
    { tri: ["A", "B", "C"], cotes: { opp: 7, adj: 9 }, cherche: "angle" },
    { tri: ["A", "B", "C"], angle: 28, cotes: { opp: 4 }, cherche: "hyp" },
    { tri: ["D", "E", "F"], cotes: { adj: 5, opp: 12 }, cherche: "combine" }
  ];
  const NOMS_COTES = { adj: "adjacent", opp: "opposé", hyp: "hypoténuse" };
  function cotesDe(tri) { const [X, R, Y] = tri; return { adj: X + R, opp: R + Y, hyp: X + Y }; }
  /* La fonction qui relie deux côtés : sin (opposé, hypoténuse), cos (adjacent, hypoténuse), tan (opposé, adjacent). */
  function fonction(a, b) {
    const k = [a, b].sort().join("-");
    return { "hyp-opp": { f: "sin", haut: "opp", bas: "hyp", calc: Math.sin, inv: Math.asin },
      "adj-hyp": { f: "cos", haut: "adj", bas: "hyp", calc: Math.cos, inv: Math.acos },
      "adj-opp": { f: "tan", haut: "opp", bas: "adj", calc: Math.tan, inv: Math.atan } }[k];
  }

  /* Le corrigé d'un exercice : { enonce, question, reperage, lignes: [...], resultat } */
  function resoudre(ex) {
    const [X, R, Y] = ex.tri, N = cotesDe(ex.tri), A = chapeau(X), nomTri = ex.tri.slice().sort().join("");
    const donnees = Object.entries(ex.cotes).map(([k, v]) => N[k] + " = " + virgule(String(v)));
    if (ex.angle != null) donnees.unshift(A + " = " + ex.angle + "°");
    const enonce = "Le triangle " + nomTri + " est rectangle en " + R + ". " + donnees.join(" ; ") + ".";
    if (ex.cherche === "combine") return resoudreCombine(ex, N, enonce);
    const connus = Object.keys(ex.cotes);
    const reperage = "Depuis " + A + " : " + ["adj", "opp", "hyp"].map(k => N[k] + " est " + (k === "hyp" ? "l'hypoténuse" : "le côté " + NOMS_COTES[k])).join(", ") + ".";
    if (ex.cherche === "angle") {
      const fn = fonction(connus[0], connus[1]), h = ex.cotes[fn.haut], b = ex.cotes[fn.bas], q = h / b, ang = fn.inv(q) / RAD;
      const rq = nombre(q), ra = nombre(ang);
      const lignes = [fn.f + " " + A + " = " + N[fn.haut] + " ÷ " + N[fn.bas],
        fn.f + " " + A + " = " + virgule(String(h)) + " ÷ " + virgule(String(b)) + (rq.exact ? " = " + rq.texte : ""),
        A + " = " + fn.f + "⁻¹(" + (rq.exact ? rq.texte : virgule(String(h)) + " ÷ " + virgule(String(b))) + ")" + egal(ra, "°")];
      return { enonce, question: "Calcule l'angle " + A + ".", reperage, fonction: fn.f, lignes, resultat: A + egal(ra, "°"), valeur: ang, figure: figure(ex) };
    }
    const k = connus[0], fn = fonction(k, ex.cherche), v = ex.cotes[k], t = fn.calc(ex.angle * RAD);
    const enHaut = fn.haut === ex.cherche, x = enHaut ? v * t : v / t, rx = nombre(x);
    const lignes = [fn.f + " " + A + " = " + N[fn.haut] + " ÷ " + N[fn.bas],
      fn.f + " " + ex.angle + "° = " + (enHaut ? N[ex.cherche] + " ÷ " + virgule(String(v)) : virgule(String(v)) + " ÷ " + N[ex.cherche]),
      N[ex.cherche] + " = " + (enHaut ? virgule(String(v)) + " × " + fn.f + " " + ex.angle + "°" : virgule(String(v)) + " ÷ " + fn.f + " " + ex.angle + "°") + egal(rx)];
    return { enonce, question: "Calcule " + N[ex.cherche] + ".", reperage, fonction: fn.f, sens: enHaut ? "multiplier" : "diviser", lignes, resultat: N[ex.cherche] + egal(rx), valeur: x, figure: figure(ex) };
  }
  /* L'exercice combiné : Pythagore, puis l'angle par la tangente, vérifié par le sinus, puis le 3e angle. */
  function resoudreCombine(ex, N, enonce) {
    const [X, , Y] = ex.tri, A = chapeau(X), B = chapeau(Y), adj = ex.cotes.adj, opp = ex.cotes.opp;
    const hyp2 = adj * adj + opp * opp, hyp = Math.sqrt(hyp2), rh = nombre(hyp);
    const ang = Math.atan(opp / adj) / RAD, ang2 = Math.asin(opp / hyp) / RAD, autre = 90 - ang;
    // le 3e angle se déduit de l'angle arrondi écrit juste avant : 90° − 67,38° = 22,62° tombe juste
    const ra = nombre(ang), ra2 = nombre(ang2), rb = nombre(90 - Math.round(ang * 100) / 100), rq = nombre(opp / adj);
    const parties = [
      { q: "a) Calcule " + N.hyp + " avec Pythagore.", lignes: [N.hyp + "² = " + N.adj + "² + " + N.opp + "²", N.hyp + "² = " + adj + "² + " + opp + "² = " + adj * adj + " + " + opp * opp + " = " + hyp2, N.hyp + " = √" + hyp2 + egal(rh)] },
      { q: "b) Calcule l'angle " + A + " avec la tangente.", lignes: ["tan " + A + " = " + N.opp + " ÷ " + N.adj + " = " + opp + " ÷ " + adj + (rq.exact ? " = " + rq.texte : ""), A + " = tan⁻¹(" + (rq.exact ? rq.texte : opp + " ÷ " + adj) + ")" + egal(ra, "°")] },
      { q: "c) Vérifie avec le sinus.", lignes: ["sin " + A + " = " + N.opp + " ÷ " + N.hyp + " = " + opp + " ÷ " + rh.texte, A + " = sin⁻¹(" + opp + " ÷ " + rh.texte + ")" + egal(ra2, "°") + " : c'est le même angle."] },
      { q: "d) Déduis-en l'angle " + B + ".", lignes: ["Dans un triangle rectangle, les deux angles aigus font 90° à eux deux.", B + " = 90° " + MOINS + " " + ra.texte + "°" + egal(rb, "°")] }
    ];
    return { enonce, question: parties.map(p => p.q).join(" "), parties, reperage: "Depuis " + A + " : " + N.adj + " est le côté adjacent, " + N.opp + " le côté opposé, " + N.hyp + " l'hypoténuse.",
      resultat: N.hyp + egal(rh) + " ; " + A + egal(ra, "°") + " ; " + B + egal(rb, "°"), valeurs: { hyp, ang, ang2, autre }, figure: figure(ex) };
  }

  /* La figure : ce que l'énoncé donne, et « ? » sur ce qu'on cherche. */
  function figure(ex) {
    const N = cotesDe(ex.tri), lab = k => ex.cotes[k] != null ? virgule(String(ex.cotes[k])) : ex.cherche === k || (ex.cherche === "combine" && k === "hyp") ? "?" : "";
    return { sommets: ex.tri, cotes: { adj: lab("adj"), opp: lab("opp"), hyp: lab("hyp") }, angle: ex.angle != null ? ex.angle + "°" : ex.cherche === "angle" || ex.cherche === "combine" ? "?" : "", noms: N };
  }

  /* Le test de la calculatrice : en degrés, sin 30 donne 0,5. */
  const testCalculatrice = () => nombre(Math.sin(30 * RAD)).texte;
  const radians = (deg) => nombre(Math.sin(deg)).texte;                        // ce qu'affiche une calculatrice restée en radians

  MM.trigo = { EXOS, resoudre, fonction, cotesDe, testCalculatrice, radians, nombre, fiche: () => EXOS.map(resoudre) };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
