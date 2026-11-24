/* Mission Maths — nombres.js
   Calculs sur les nombres relatifs : palier P1 (signes, priorités) et étape « Vérifie » de P4.
   On juge la valeur exacte ET la forme écrite (parenthèses enlevées, multiplications faites, un seul nombre).
   Erreurs types : SIG-REL (un signe qui saute), PRIO (calcul de gauche à droite), CALC (une opération fausse).
   Rien n'est écrit à la main : chaque bonne ligne et chaque réponse fausse est calculée. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  if (typeof require === "function" && !MM.saisie) require("./saisie.js");
  const E = MM.expr, F = MM.F, MOINS = E.MOINS;

  /* ---------- arbre : num {v}, neg {a}, grp {a}, add | sub | mul | div {a, b} ---------- */
  const num = v => ({ t: "num", v: F(v) });
  const grp = a => ({ t: "grp", a });
  const op = (t, a, b) => ({ t, a, b });
  const sansGrp = n => { while (n.t === "grp") n = n.a; return n; };
  const estSomme = n => { const m = sansGrp(n); return m.t === "add" || m.t === "sub"; };

  function valeur(n) {
    switch (n.t) {
      case "num": return n.v;
      case "neg": return valeur(n.a).oppose();
      case "grp": return valeur(n.a);
      case "add": return valeur(n.a).plus(valeur(n.b));
      case "sub": return valeur(n.a).moins(valeur(n.b));
      case "mul": return valeur(n.a).fois(valeur(n.b));
      case "div": { const d = valeur(n.b); if (d.estNul()) throw new MM.ErreurLecture("division-zero"); return valeur(n.a).sur(d); }
      case "pow": { let r = F(1); const b = valeur(n.a); for (let i = 0; i < n.n; i++) r = r.fois(b); return r; }
    }
    throw new MM.ErreurLecture("pas-un-nombre");
  }
  function contient(n, types) {
    if (types.includes(n.t)) return true;
    return ["a", "b"].some(k => n[k] && typeof n[k] === "object" && contient(n[k], types));
  }
  const contientParSomme = n => n.t === "grp" && estSomme(n) || ["a", "b"].some(k => n[k] && typeof n[k] === "object" && contientParSomme(n[k]));

  /* ---------- écriture affichée : « −7 − (−3) », « 4 × (−2) », « 12 − 2 × (5 − 8) » ---------- */
  const abs = v => v.abs().texte();
  function ecrire(n, premier) {
    if (premier === undefined) premier = true;
    const entre = s => "(" + s + ")";
    switch (n.t) {
      case "num": return n.v.signe() < 0 ? (premier ? MOINS + abs(n.v) : entre(MOINS + abs(n.v))) : abs(n.v);
      case "neg": {
        const simple = (n.a.t === "num" && n.a.v.signe() >= 0) || n.a.t === "grp";
        const s = MOINS + (simple ? ecrire(n.a, true) : entre(ecrire(n.a, true)));
        return premier ? s : entre(s);
      }
      case "grp": return entre(ecrire(n.a, true));
      case "add": return ecrire(n.a, premier) + " + " + ecrire(n.b, false);
      case "sub": return ecrire(n.a, premier) + " " + MOINS + " " + (n.b.t === "add" || n.b.t === "sub" ? entre(ecrire(n.b, true)) : ecrire(n.b, false));
      case "mul": case "div": {
        const g = n.a.t === "add" || n.a.t === "sub" ? entre(ecrire(n.a, true)) : ecrire(n.a, premier);
        const d = ["add", "sub", "mul", "div"].includes(n.b.t) ? entre(ecrire(n.b, true)) : ecrire(n.b, false);
        return g + (n.t === "mul" ? " × " : " ÷ ") + d;
      }
      case "pow": return ecrire(n.a, premier) + (n.n === 2 ? "²" : "^" + n.n);
    }
    return "?";
  }
  /* Une liste de nombres signés : « −3 − 8 + 5 ». */
  function ecrireListe(vals) {
    if (!vals.length) return "0";
    return vals.map((v, i) => i === 0 ? (v.signe() < 0 ? MOINS : "") + abs(v) : (v.signe() < 0 ? " " + MOINS + " " : " + ") + abs(v)).join("");
  }

  /* ---------- les termes d'une somme, avec le signe écrit devant chacun ----------
     op : les signes collés devant le terme (« −− » pour « − (−3) », « +− » pour « + (−3) »). */
  function plats(n, s, opx, out) {
    s = s || 1; out = out || [];
    switch (n.t) {
      case "add": plats(n.a, s, opx, out); plats(n.b, s, "+", out); break;
      case "sub": plats(n.a, s, opx, out); plats(n.b, -s, MOINS, out); break;
      case "neg": plats(n.a, -s, (opx || "") + MOINS, out); break;
      case "grp": if (estSomme(n)) out.push({ s, n, op: opx || "", sorte: "parenthese" }); else plats(n.a, s, opx, out); break;
      case "num":
        if (n.v.signe() < 0) out.push({ s: -s, n: num(n.v.abs()), op: (opx || "") + MOINS, sorte: "nombre" });
        else out.push({ s, n, op: opx || "", sorte: "nombre" });
        break;
      default: out.push({ s, n, op: opx || "", sorte: n.t === "mul" || n.t === "div" ? "produit" : "autre" });
    }
    return out;
  }
  const valeurTerme = p => valeur(p.n).fois(p.s);
  const double = p => p.op.length >= 2;

  /* ---------- formes : ce que l'étape demande d'avoir fait ---------- */
  function simple(n) {                 // ni parenthèse, ni deux signes collés
    let ok = true;
    (function v(m, apresOp) {
      if (!ok) return;
      if (m.t === "grp") { ok = false; return; }
      if (m.t === "num") { if (m.v.signe() < 0 && apresOp) ok = false; return; }
      if (m.t === "neg") { if (apresOp || m.a.t !== "num") ok = false; return; }
      if (m.a) v(m.a, apresOp);
      if (m.b) v(m.b, true);
    })(n, false);
    return ok;
  }
  const FORMES = {
    parenthese: n => !contientParSomme(n),
    sanspar: n => simple(n) && !contient(n, ["mul", "div", "pow"]),
    produit: n => simple(n) && !contient(n, ["mul", "div", "pow"]),
    nombre: n => { const m = sansGrp(n); return m.t === "num" || (m.t === "neg" && m.a.t === "num"); }
  };
  const ORDRE = ["parenthese", "produit", "nombre"];
  const ETAPES = {
    parenthese: { nom: "Calcule la parenthèse", consigne: "Commence par ce qui est entre parenthèses.", indice: "Les parenthèses passent en premier.",
      manque: "C'est juste, mais la parenthèse n'est pas encore calculée.", pourquoi: "On calcule d'abord ce qui est entre parenthèses." },
    sanspar: { nom: "Enlève les parenthèses", consigne: "Un seul signe entre deux nombres.", indice: "Deux signes collés : pareils donnent +, différents donnent −.",
      manque: "C'est juste, mais il reste deux signes collés.", pourquoi: "Moins par moins donne plus. Plus par moins donne moins." },
    produit: { nom: "Multiplie d'abord", consigne: "Fais les × et les ÷. Garde les + et les −.", indice: "La multiplication passe avant l'addition.",
      manque: "C'est juste, mais il reste un × ou un ÷ à faire.", pourquoi: "Les × et les ÷ passent avant les + et les −." },
    nombre: { nom: "Calcule", consigne: "Un seul nombre à la fin.", indice: "Calcule de gauche à droite, avec les signes.",
      manque: "C'est juste, mais termine le calcul : un seul nombre.", pourquoi: "On calcule de gauche à droite, signe compris." }
  };

  /* ---------- lignes modèles ---------- */
  function sansParentheses(n) {        // chaque parenthèse qui contient une somme est remplacée par sa valeur
    if (n.t === "grp" && estSomme(n)) return num(valeur(n));
    if (n.t === "num" || n.t === "x") return n;
    const o = Object.assign({}, n);
    if (n.a) o.a = sansParentheses(n.a);
    if (n.b) o.b = sansParentheses(n.b);
    return o;
  }
  function prochaine(n, forme) {
    if (forme === "parenthese") return ecrire(sansParentheses(n));
    if (forme === "produit" || forme === "sanspar") return ecrireListe(plats(sansParentheses(n)).map(valeurTerme));
    return ecrireListe([valeur(n)]);
  }
  /* Les étapes utiles d'un calcul, et le corrigé pas à pas. */
  function chaine(n0) {
    const out = [];
    let prev = n0, der = ecrire(n0);
    const formes = [];
    if (contientParSomme(n0)) formes.push("parenthese");
    formes.push(contient(n0, ["mul", "div", "pow"]) ? "produit" : "sanspar");
    formes.push("nombre");
    for (const f of formes) {
      if (FORMES[f](prev) && f !== "nombre") continue;
      const l = prochaine(prev, f);
      if (l === der) continue;
      out.push({ id: f, forme: f, nom: ETAPES[f].nom, ligne: l, pourquoi: ETAPES[f].pourquoi });
      der = l; prev = E.arbre(l);
    }
    // une étape intermédiaire qui donne déjà le résultat final n'en est pas une
    if (out.length >= 2 && out[out.length - 2].ligne === out[out.length - 1].ligne) out.splice(out.length - 2, 1);
    if (out.length >= 2 && FORMES.nombre(E.arbre(out[out.length - 2].ligne))) out.splice(out.length - 2, 1);
    // la dernière étape donne un seul nombre : c'est toujours « Calcule »
    const der2 = out[out.length - 1];
    if (der2 && der2.id !== "nombre" && FORMES.nombre(E.arbre(der2.ligne))) Object.assign(der2, { id: "nombre", forme: "nombre", nom: ETAPES.nombre.nom, pourquoi: der2.id === "produit" ? ETAPES.produit.pourquoi : ETAPES.nombre.pourquoi });
    return out;
  }

  /* ---------- calcul « de gauche à droite », sans priorité : la réponse que donne l'erreur PRIO ---------- */
  function gaucheADroite(n) {
    const s = E.normaliser(ecrire(n));
    let p = 0;
    const lireNombre = () => { const m = /^\d+(\.\d+)?/.exec(s.slice(p)); if (!m) throw new Error("PRIO : lecture"); p += m[0].length; return F(m[0]); };
    function primaire() {
      if (s[p] === "-") { p++; return primaire().oppose(); }
      if (s[p] === "+") { p++; return primaire(); }
      if (s[p] === "(") { p++; const v = suite(); p++; return v; }
      return lireNombre();
    }
    function suite() {
      let v = primaire();
      while (p < s.length && "+-*/".includes(s[p])) {
        const o = s[p++], w = primaire();
        v = o === "+" ? v.plus(w) : o === "-" ? v.moins(w) : o === "*" ? v.fois(w) : (w.estNul() ? v : v.sur(w));
      }
      return v;
    }
    return suite();
  }
  function premierProduit(n) {
    let r = null;
    (function v(m) { if (r) return; if (m.t === "mul" || m.t === "div") { r = m; return; } if (m.a) v(m.a); if (m.b) v(m.b); })(n);
    return r;
  }

  /* ---------- toutes les réponses fausses « connues » à partir d'une ligne ---------- */
  function candidats(n) {
    const out = [], v0 = valeur(n), P = plats(n);
    const aj = (code, v, detail) => { if (!v.egal(v0)) out.push({ code, valeur: v, detail }); };
    // PRIO : tout calculé de gauche à droite
    if (contient(n, ["mul", "div"]) && P.length >= 2) {
      const pr = premierProduit(n);
      aj("PRIO", gaucheADroite(n), { sorte: "prio", ligne: ecrire(n), produit: ecrire(pr), valeurProduit: valeur(pr) });
    }
    // SIG-REL : le signe d'un terme qui saute (deux signes collés mal lus, ou signe oublié)
    if (P.length >= 2) P.forEach((p, index) => {
      const vt = valeurTerme(p);
      if (p.sorte === "produit") aj("SIG-REL", v0.moins(vt).moins(vt), { sorte: "produit", calcul: ecrire(p.n), bon: valeur(p.n), faux: valeur(p.n).oppose() });
      else aj("SIG-REL", v0.moins(vt).moins(vt), { sorte: double(p) ? "double" : "terme", index, ecrit: (p.op.length >= 2 ? p.op[0] + " (" + p.op.slice(1) + abs(valeur(p.n)) + ")" : (vt.signe() < 0 ? MOINS : "") + abs(vt)), bon: vt, faux: vt.oppose() });
    });
    // SIG-REL : le signe du résultat (une somme, un produit)
    if (!v0.estNul()) {
      const seul = P.length === 1 && P[0].sorte === "produit";
      aj("SIG-REL", v0.oppose(), { sorte: seul ? "produit" : "resultat", calcul: ecrire(seul ? P[0].n : n), bon: v0, faux: v0.oppose() });
    }
    // SIG-REL : le signe d'une parenthèse mal calculé (5 − 8 → 3)
    (function v(m, chemin) {
      if (m.t === "grp" && estSomme(m)) {
        const w = valeur(m);
        if (!w.estNul()) {
          const remplace = x => x === m ? num(w.oppose()) : x.t === "num" ? x : Object.assign({}, x, x.a ? { a: remplace(x.a) } : {}, x.b ? { b: remplace(x.b) } : {});
          aj("SIG-REL", valeur(remplace(n)), { sorte: "parenthese", calcul: ecrire(m.a), bon: w, faux: w.oppose() });
        }
        return;
      }
      if (m.a) v(m.a); if (m.b) v(m.b);
    })(n);
    return out;
  }
  const PRIORITE = ["PRIO", "SIG-REL"];
  /* Table « code → réponses finales fausses » (clés exactes) : une seule erreur, le reste juste. */
  function reponsesFausses(n) {
    const t = {};
    for (const c of candidats(n)) (t[c.code] || (t[c.code] = new Set())).add(c.valeur.cle());
    const out = {}; for (const k of Object.keys(t)) out[k] = [...t[k]];
    return out;
  }

  /* ---------- diagnostic d'une ligne fausse ---------- */
  function formeAtteinte(n) { return FORMES.nombre(n) ? "nombre" : FORMES.produit(n) ? "produit" : FORMES.parenthese(n) ? "parenthese" : null; }
  function diagnostiquer(prev, cur) {
    const v = valeur(cur);
    // « le signe du résultat » ne vaut que pour une ligne qui est déjà un seul nombre
    const c = candidats(prev).filter(k => k.valeur.egal(v) && (k.detail.sorte !== "resultat" || FORMES.nombre(cur))).sort((a, b) => PRIORITE.indexOf(a.code) - PRIORITE.indexOf(b.code));
    if (c.length) return { code: c[0].code, detail: c[0].detail, nombre: true, ambigu: new Set(c.map(k => k.code)).size > 1 };
    // une seule opération fausse : on la retrouve en comparant à la ligne modèle de même forme
    const f = formeAtteinte(cur);
    if (f) {
      const modele = E.arbre(prochaine(prev, f)), A = plats(modele).map(valeurTerme), B = plats(cur).map(valeurTerme);
      if (A.length === B.length) {
        const diff = A.map((a, i) => a.egal(B[i]) ? -1 : i).filter(i => i >= 0);
        if (diff.length === 1) {
          const i = diff[0], src = plats(sansParentheses(prev));
          if (f === "nombre") return { code: "CALC", nombre: true, detail: { sorte: "calcul", calcul: ecrire(prev), bon: A[0], faux: B[0], seul: true } };
          // un produit faux : on l'écrit tel qu'il est posé (« 2 × (−3) = −6, pas −5 »), signe d'écriture retiré
          if (f === "produit" && src.length === A.length && src[i].sorte === "produit")
            return { code: "CALC", nombre: true, detail: { sorte: "calcul", calcul: ecrire(src[i].n), bon: valeur(src[i].n), faux: B[i].fois(src[i].s), seul: false } };
        }
        // plusieurs nombres faux (recette du 23/11) : chacun est nommé, avec le calcul à refaire
        if (diff.length >= 2) {
          const src = plats(sansParentheses(prev));
          const fautes = diff.map(i => ({ bon: A[i], faux: B[i], calcul: f === "produit" && src.length === A.length && src[i].sorte === "produit" ? ecrire(src[i].n) : null,
            nature: A[i].abs().egal(B[i].abs()) ? "signe" : A[i].signe() === B[i].signe() ? "valeur" : "tout" }));
          const code = fautes.every(x => x.nature === "signe") ? "SIG-REL" : fautes.every(x => x.calcul) ? "CALC" : null;
          return { code, nombre: true, detail: { sorte: "plusieurs", fautes, justes: A.length - diff.length } };
        }
      } else if (B.length !== A.length) {
        return { code: null, nombre: true, detail: { sorte: "compte", attendus: A.length, ecrits: B.length } };
      }
    }
    return { code: null, nombre: true, detail: { sorte: "inconnu" } };
  }

  /* ---------- l'explication du prof (variante 2 : une autre image, ou un exemple chiffré) ---------- */
  const t = v => v.texte();
  function expliquer(d, variante) {
    const CAT = MM.diag ? MM.diag.CATALOGUE : {};
    const code = d && d.code, x = (d && d.detail) || {}, v2 = variante === 2, cacher = !!(d && d.cacher);
    // jamais la valeur juste (D37, recette du 24/11) : le calcul à refaire, et ce qui cloche (signe ou valeur)
    const egalA = (calcul, bon, faux) => "Mais " + calcul + " ne fait pas " + t(faux) + (bon && bon.abs().egal(faux.abs()) ? " : regarde le signe." : ".");
    const fin = (titre, bon, ou, regle) => ({ code: code || null, titre, bon, ou, regle, suite: "", reflexe: code && CAT[code] ? CAT[code].reflexe : "", variante: v2 ? 2 : 1 });
    if (x.sorte === "plusieurs") {
      const NAT = { signe: "regarde son signe.", valeur: "la valeur est fausse.", tout: "signe et valeur." };
      const ph = x.fautes.map(f => f.calcul ? "Pour " + t(f.faux) + ", refais " + f.calcul + " : " + NAT[f.nature] : "Le nombre " + t(f.faux) + " : " + NAT[f.nature]);
      return fin(code === "SIG-REL" ? CAT["SIG-REL"].nom : "Plusieurs nombres à revoir", x.justes ? "Une partie de ta ligne est juste." : "Tu es sur la bonne étape.",
        ph.length > 3 ? ph.slice(0, 2).join(" ") + " Et " + (ph.length - 2) + " autres." : ph.join(" "),
        v2 ? "Entoure chaque signe dans la ligne d'avant, puis refais un nombre à la fois." : "Un calcul à la fois : le signe d'abord, puis la valeur.");
    }
    if (x.sorte === "compte") return fin("Pas le bon nombre de termes", "Tu es sur la bonne étape.",
      "Il faut " + x.attendus + " nombre" + (x.attendus > 1 ? "s" : "") + " dans cette ligne. Tu en as écrit " + x.ecrits + ".",
      v2 ? "Compte les nombres de la ligne d'avant : chacun doit se retrouver." : "Chaque nombre de la ligne d'avant doit se retrouver, une fois.");
    if (code === "PRIO") return fin(CAT.PRIO.nom, "Tes calculs sont justes.", "Mais tu as calculé de gauche à droite. Le × passe avant.",
      v2 ? "Les × et ÷ sont prioritaires, comme un piéton au passage clouté. Ici : " + x.produit + " d'abord."
         : "D'abord " + x.produit + ", ensuite le reste.");
    if (code === "SIG-REL" && x.sorte === "double") return fin(CAT["SIG-REL"].nom, "Tu as bien gardé les nombres.",
      "Mais dans " + x.ecrit + ", il y a deux signes collés.",
      v2 ? "L'ascenseur : enlever une descente, c'est monter. Ajouter une descente, c'est descendre."
         : "Signes collés pareils : +. Signes collés différents : −.");
    if (code === "SIG-REL" && x.sorte === "terme") return fin(CAT["SIG-REL"].nom, "Tes nombres sont bons.",
      "Mais le signe de " + x.ecrit + " a changé en route.", v2 ? "Entoure chaque signe avant de calculer. Il voyage avec son nombre." : "Chaque nombre garde le signe écrit juste devant lui.");
    if (code === "SIG-REL" && x.sorte === "produit") return fin(CAT["SIG-REL"].nom, "Ta valeur est bonne, sans le signe.",
      egalA(x.calcul, x.bon, x.faux),
      v2 ? "Compte les signes moins : un nombre pair donne +, un nombre impair donne −." : "Moins par moins donne plus. Moins par plus donne moins.");
    if (code === "SIG-REL" && x.sorte === "parenthese") return fin(CAT["SIG-REL"].nom, "Tu as bien commencé par la parenthèse.",
      egalA(x.calcul, x.bon, x.faux),
      v2 ? "L'ascenseur : pars du premier nombre, puis monte ou descends." : "Le signe du résultat suit le plus grand nombre, sans son signe.");
    if (code === "SIG-REL") return fin(CAT["SIG-REL"].nom, "Ta valeur est bonne, sans le signe.",
      egalA(x.calcul, x.bon, x.faux),
      v2 ? "Avec de l'argent : un nombre négatif, c'est une dette. Fais le compte." : "L'ascenseur : pars du premier nombre, puis monte avec +, descends avec −.");
    if (code === "CALC") return fin(CAT.CALC ? CAT.CALC.nom : "Erreur de calcul", x.seul ? "Tu es sur la bonne étape." : "Le reste de ta ligne est juste.",
      egalA(x.calcul, x.bon, x.faux),
      v2 ? "Fais-le en deux temps : le signe d'abord, puis la valeur, au brouillon." : "Un calcul à la fois, au brouillon.");
    return fin("Ce n'est pas le bon résultat", "Je ne trouve pas l'erreur exacte.", "Ta ligne n'a plus la même valeur que la ligne d'avant.",
      v2 ? "Refais le calcul en entourant chaque signe." : "Reprends le calcul pas à pas, au brouillon.");
  }

  /* ---------- lecture et jugement d'une ligne ---------- */
  function lire(texte) {
    try {
      const a = E.arbre(texte);
      return { ok: true, ast: a, valeur: valeur(a) };
    } catch (e) {
      if (e instanceof MM.ErreurLecture) return { ok: false, raison: e.code, message: MM.saisie.messageLecture(e.code, e.info) };
      if (e instanceof RangeError) return { ok: false, raison: "division-zero", message: MM.saisie.messageLecture("division-zero") };
      throw e;
    }
  }
  function juger(prev, texte, forme) {
    const lu = lire(texte);
    if (!lu.ok) return { statut: "illisible", raison: lu.raison, message: lu.message };
    const cur = lu.ast, ecrit = ecrire(cur);
    if (lu.valeur.egal(valeur(prev))) {
      if (forme && !FORMES[forme](cur)) return { statut: "incomplet", ast: cur, ecrit, manque: forme, message: ETAPES[forme].manque };
      return { statut: "juste", ast: cur, ecrit };
    }
    const d = diagnostiquer(prev, cur);
    // la ligne attendue est le résultat final : l'explication ne doit pas le donner (D37 : jamais la ligne avant la 5e erreur)
    d.cacher = forme === "nombre" || FORMES.nombre(cur);
    return { statut: "faux", ast: cur, ecrit, code: d.code, diag: d, attendu: prochaine(prev, forme || formeAtteinte(cur) || "nombre") };
  }
  /* Démarche libre (mode seul) : chaque ligne jugée à partir de la précédente de l'élève. */
  function evaluerDemarche(n0, lignes) {
    let prev = n0, nbErreurs = 0, premiere = -1;
    const res = lignes.map((txt, i) => {
      const v = juger(prev, txt, null);
      if (v.statut === "faux") { nbErreurs++; if (premiere < 0) premiere = i; }
      if (v.ast) prev = v.ast;
      return v;
    });
    const der = res[res.length - 1];
    const fini = !!(der && der.ast && FORMES.nombre(der.ast));
    return { lignes: res, nbErreurs, premiereErreur: premiere, fini, resultatJuste: fini && valeur(der.ast).egal(valeur(n0)) };
  }

  /* ---------- « Vérifie » : un côté d'une équation, x remplacé par sa valeur ---------- */
  function substituer(termes, x) {
    const nx = () => num(x);
    const noeud = tm => {             // le terme sans son signe, et son signe
      const c = tm.c, a = c.abs();
      let corps;
      const facteurX = tm.d === 0 ? null : tm.d === 1 ? nx() : { t: "pow", a: nx(), n: tm.d };
      if (tm.inner) {
        const dedans = grp(somme(tm.inner));
        corps = tm.d ? op("mul", facteurX, dedans) : dedans;
        if (!a.egal(1)) corps = op("mul", num(a), corps);
      } else if (!facteurX) corps = num(a);
      else corps = a.egal(1) ? facteurX : op("mul", num(a), facteurX);
      return { s: c.signe() < 0 ? -1 : 1, corps };
    };
    function somme(ts) {
      let acc = null;
      for (const tm of ts) {
        const { s, corps } = noeud(tm);
        const seulNombre = !tm.inner && tm.d === 0;            // « −5 » reste « −5 » ; « −x » devient « −(−2) »
        if (!acc) acc = s < 0 ? (seulNombre ? num(corps.v.oppose()) : corps.t === "mul" && corps.a.t === "num" ? op("mul", num(corps.a.v.oppose()), corps.b) : { t: "neg", a: corps }) : corps;
        else acc = op(s < 0 ? "sub" : "add", acc, corps);
      }
      return acc || num(0);
    }
    return somme(termes);
  }

  MM.nombres = { num, grp, op, valeur, ecrire, ecrireListe, plats, valeurTerme, FORMES, ORDRE, ETAPES, prochaine, chaine, gaucheADroite,
    candidats, reponsesFausses, diagnostiquer, expliquer, lire, juger, evaluerDemarche, substituer, formeAtteinte, sansParentheses };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
