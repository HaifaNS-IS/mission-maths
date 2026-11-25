/* Mission Maths — progression.js
   Les paliers, leurs statuts et les règles de passage (cahier des charges, section 3). Fonctions pures, sans accès à l'écran. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function" && !MM.Fraction) require("./fraction.js");
  const F = MM.F;

  const PALIERS = [
    { id: "P0", nom: "Diagnostic", resume: "Une question par notion, sans aide." },
    { id: "P1", nom: "Nombres relatifs", resume: "Règle des signes, priorités, soustraire un négatif." },
    { id: "P2", nom: "Calcul littéral", resume: "Termes semblables, réduire, distribuer." },
    { id: "P3", nom: "Équations simples", resume: "La balance : même opération des deux côtés." },
    { id: "P4", nom: "Équations complètes", resume: "x des deux côtés, parenthèses, fractions." },
    { id: "P5", nom: "Second degré", resume: "a, b, c, discriminant, deux solutions." },
    { id: "P6", nom: "Repère et points", resume: "Abscisse, ordonnée, placer et lire un point." },
    { id: "P7", nom: "Fonctions affines", resume: "y = mx + b, pente, sens de variation." },
    { id: "P8", nom: "Intersections et pente", resume: "Couper les axes, pente entre deux points." },
    { id: "P9", nom: "Deux droites et triangle", resume: "Intersection, hauteur, aire." },
    { id: "P10", nom: "Équation d'une droite", resume: "Avec la pente et un point, ou deux points." },
    { id: "P11", nom: "Milieu et distance", resume: "Milieu d'un segment, longueur, exercices combinés." },
    { id: "P12", nom: "Pythagore", resume: "Repérer l'hypoténuse, calculer un côté." },
    { id: "P13", nom: "Trigonométrie", resume: "sin, cos, tan : un côté ou un angle, en degrés." },
    { id: "FINAL", nom: "Examen blanc", resume: "5 exercices, 50 minutes, démarche exigée." }
  ];
  const STATUTS = { verrouille: "Verrouillé", en_cours: "En cours", valide: "Validé", a_consolider: "À consolider" };
  const PARCOURS = ["lecon", "guide", "semi", "seul", "examen"];         // l'ordre d'un palier
  const NOMS_PARCOURS = { lecon: "Leçon", guide: "Série guidée", semi: "Série semi-guidée", seul: "Série seul", examen: "Examen de palier" };
  const SEUIL = { num: 80, den: 100 };                                    // 80 % pour passer

  const idx = id => PALIERS.findIndex(p => p.id === id);
  function etatInitial() {
    const o = {};
    PALIERS.forEach((p, i) => { o[p.id] = { statut: i === 0 ? "en_cours" : "verrouille", meilleurExamen: null, valideLe: null, echecsRevision: 0, fait: {} }; });
    return o;
  }
  /* 80 % ou plus : calcul exact, pour que 79 % ne passe jamais par arrondi. */
  function reussi(points, total) {
    const t = F(String(total));
    if (t.signe() <= 0) return false;
    return F(String(points)).fois(SEUIL.den).cmp(t.fois(SEUIL.num)) >= 0;
  }
  const pourcent = (points, total) => Math.floor(F(String(points)).fois(100).sur(F(String(total))).approx() + 1e-9);

  /* Résultat d'un examen de palier : renvoie un nouvel état, sans modifier l'ancien. */
  function apresExamen(paliers, id, points, total, maintenant) {
    const o = JSON.parse(JSON.stringify(paliers)), p = o[id];
    if (!p || p.statut === "verrouille") return o;                        // on ne valide pas un palier fermé
    const pct = pourcent(points, total);
    if (p.meilleurExamen == null || pct > p.meilleurExamen) p.meilleurExamen = pct;
    if (reussi(points, total)) {
      p.statut = "valide"; p.valideLe = p.valideLe || maintenant; p.echecsRevision = 0;
      const suivant = PALIERS[idx(id) + 1];
      if (suivant && o[suivant.id].statut === "verrouille") o[suivant.id].statut = "en_cours";
    }
    return o;
  }
  /* Révision espacée : deux échecs de suite sur un palier validé le repassent « à consolider ». */
  function apresRevision(paliers, id, juste) {
    const o = JSON.parse(JSON.stringify(paliers)), p = o[id];
    if (!p || (p.statut !== "valide" && p.statut !== "a_consolider")) return o;
    p.echecsRevision = juste ? 0 : (p.echecsRevision || 0) + 1;
    if (p.statut === "valide" && p.echecsRevision >= 2) p.statut = "a_consolider";
    return o;
  }
  /* Le palier sur lequel l'élève travaille : le premier « en cours » ou « à consolider ». */
  function palierActuel(paliers) {
    const p = PALIERS.find(q => paliers[q.id] && (paliers[q.id].statut === "en_cours" || paliers[q.id].statut === "a_consolider"));
    return p ? p.id : PALIERS[PALIERS.length - 1].id;
  }
  /* « Section suivante » : le premier contenu pas encore fait du palier, dans l'ordre leçon → séries → examen. */
  function sectionSuivante(fait, disponibles) {
    const ordre = disponibles || PARCOURS;
    return ordre.find(s => !(fait && fait[s])) || null;
  }

  MM.progression = { PALIERS, STATUTS, PARCOURS, NOMS_PARCOURS, SEUIL, etatInitial, reussi, pourcent, apresExamen, apresRevision, palierActuel, sectionSuivante };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
