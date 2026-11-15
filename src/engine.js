/*
 * Moteur de simulation – fonctions pures, sans DOM.
 * Utilisable dans le navigateur (window.SimLoc) et dans Node (module.exports).
 *
 * Convention : toutes les grandeurs « bien » sont calculées pour 100 % du bien,
 * puis ramenées à la quote-part du foyer (partFoyer) pour la fiscalité personnelle.
 * Les montants sont en euros, les taux en décimal (0.035 = 3,5 %).
 */
(function (root) {
  'use strict';

  var R = (typeof module !== 'undefined' && module.exports) ? require('./regimes.js') : root.Regimes;

  // ---------------------------------------------------------------------------
  // Paramètres par défaut
  // ---------------------------------------------------------------------------
  function defaultParams() {
    return {
      anneeAcquisition: 2027,
      horizon: 25,
      partFoyer: 1,
      bien: {
        prix: 200000,
        valeurMarche: null,          // null = prix
        fraisNotaire: 15000,
        fraisAgence: 0,
        quotePartTerrain: 0.15,
        travaux: 0,
        travauxNature: 'amelioration', // 'amelioration' | 'entretien'
        mobilier: 8000,
        dureeAmortBati: 20,   // moyenne des composants
        dureeAmortTravaux: 15,
        dureeAmortMobilier: 7,
        fraisAcquisitionMode: 'amortis' // 'amortis' | 'charges'
      },
      pret: {
        apport: 30000,
        taux: 0.035,
        dureeAns: 20,
        tauxAssurance: 0.0025,  // % annuel du capital initial
        fraisDossierGarantie: 2500
      },
      location: {
        type: 'tourisme_non_classe',
        loyerMensuel: 950,      // longue durée / bail mobilité
        vacanceMois: 0.5,
        prixNuit: 90,
        tauxOccupation: 0.65,
        fraisGestionPct: 0.20,  // conciergerie + plateforme (courte) ou gestion locative (longue)
        loyerNuMensuel: 800,    // utilisé par la SCI à l'IR (location nue)
        fraisGestionNuPct: 0.07,
        revalorisationLoyer: 0.015
      },
      charges: {
        taxeFonciere: 1200,
        copro: 1500,
        coproRecuperablePct: 0.6, // longue durée uniquement
        assurancePNO: 200,
        entretien: 600,
        energie: 900,             // courte durée : payée par le loueur
        internet: 360,
        chargesCourteDuree: 540,  // linge et consommables
        cfe: 300,
        comptableLmnp: 500,
        comptableSociete: 1500,
        fraisSocieteAnnuels: 300,
        revalorisationCharges: 0.02
      },
      foyer: {
        revenuImposable: 60000,
        parts: 2,
        partsBase: 2
      },
      revente: {
        revalorisationBien: 0.015,
        fraisVentePct: 0.05
      },
      fiscal: {
        article7Version: 'actuel',
        article7Perso: null,
        abattementPVTravauxForfait: true
      },
      sciIs: {
        distribuer: false
      },
      social: {
        regime: 'ssi',          // 'ssi' (sur le bénéfice) | 'general' (sur les recettes)
        dejaIndependant: false  // pas de cotisation minimale supplémentaire
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Utilitaires
  // ---------------------------------------------------------------------------
  function deepMerge(base, over) {
    if (!over) return base;
    var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(over).forEach(function (k) {
      var v = over[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') out[k] = deepMerge(base[k], v);
      else out[k] = v;
    });
    return out;
  }

  function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }

  // ---------------------------------------------------------------------------
  // Impôt sur le revenu (barème + quotient familial plafonné, sans décote)
  // ---------------------------------------------------------------------------
  function baremeParPart(q, bareme) {
    var impot = 0, bas = 0;
    for (var i = 0; i < bareme.tranches.length; i++) {
      var t = bareme.tranches[i];
      if (q > bas) impot += (Math.min(q, t.jusqua) - bas) * t.taux;
      bas = t.jusqua;
    }
    return impot;
  }

  function impotRevenu(revenu, parts, partsBase, bareme) {
    bareme = bareme || R.BAREME_IR;
    revenu = Math.max(0, revenu);
    partsBase = partsBase || Math.min(parts, 2);
    var brut = parts * baremeParPart(revenu / parts, bareme);
    if (parts <= partsBase) return brut;
    var ref = partsBase * baremeParPart(revenu / partsBase, bareme);
    var avantageMax = (parts - partsBase) * 2 * bareme.plafondDemiPart;
    return Math.max(brut, ref - avantageMax);
  }

  function tmi(revenu, parts, bareme) {
    bareme = bareme || R.BAREME_IR;
    var q = Math.max(0, revenu) / parts, bas = 0;
    for (var i = 0; i < bareme.tranches.length; i++) {
      if (q <= bareme.tranches[i].jusqua) return bareme.tranches[i].taux;
      bas = bareme.tranches[i].jusqua;
    }
    return bareme.tranches[bareme.tranches.length - 1].taux;
  }

  // ---------------------------------------------------------------------------
  // Prêt amortissable à mensualités constantes
  // ---------------------------------------------------------------------------
  function tableauPret(montant, tauxAnnuel, dureeAns, tauxAssurance) {
    var n = Math.round(dureeAns * 12), i = tauxAnnuel / 12;
    var mensualite = montant <= 0 ? 0 : (i === 0 ? montant / n : montant * i / (1 - Math.pow(1 + i, -n)));
    var assuranceMensuelle = montant * (tauxAssurance || 0) / 12;
    var crd = montant, annees = [];
    for (var a = 0; a < Math.ceil(n / 12); a++) {
      var interets = 0, capital = 0, assurance = 0;
      for (var m = 0; m < 12 && a * 12 + m < n; m++) {
        var int = crd * i;
        var cap = Math.min(crd, mensualite - int);
        interets += int; capital += cap; assurance += assuranceMensuelle; crd -= cap;
      }
      annees.push({ interets: interets, capital: capital, assurance: assurance, crdFin: Math.max(0, crd) });
    }
    return { montant: montant, mensualite: mensualite, assuranceMensuelle: assuranceMensuelle, annees: annees };
  }

  function lignePret(tab, annee) { // annee 1-based ; au-delà de la durée : zéros
    return tab.annees[annee - 1] || { interets: 0, capital: 0, assurance: 0, crdFin: 0 };
  }

  // ---------------------------------------------------------------------------
  // Plus-value immobilière des particuliers
  // ---------------------------------------------------------------------------
  function abattementsDuree(n) {
    var ir = 0, ps = 0;
    for (var a = 6; a <= n; a++) {
      if (a <= 21) { ir += 0.06; ps += 0.0165; }
      else if (a === 22) { ir += 0.04; ps += 0.016; }
      else if (a <= 30) { ps += 0.09; }
    }
    return { ir: Math.min(1, Math.round(ir * 1e6) / 1e6), ps: Math.min(1, Math.round(ps * 1e6) / 1e6) };
  }

  function surtaxePV(pv) { // CGI art. 1609 nonies G, par cédant
    if (pv <= 50000) return 0;
    if (pv <= 60000) return 0.02 * pv - (60000 - pv) / 20;
    if (pv <= 100000) return 0.02 * pv;
    if (pv <= 110000) return 0.03 * pv - (110000 - pv) / 10;
    if (pv <= 150000) return 0.03 * pv;
    if (pv <= 160000) return 0.04 * pv - (160000 - pv) * 0.15;
    if (pv <= 200000) return 0.04 * pv;
    if (pv <= 210000) return 0.05 * pv - (210000 - pv) * 0.20;
    if (pv <= 250000) return 0.05 * pv;
    if (pv <= 260000) return 0.06 * pv - (260000 - pv) * 0.25;
    return 0.06 * pv;
  }

  /*
   * opts : prixCession (net de frais de vente, 100 % du bien), prix, fraisAcqReels,
   *        fraisAcqDejaDeduits, travauxReels, travauxDejaDeduits, amortReintegres,
   *        detention (années), part, forfaitTravaux (bool), tauxPS
   */
  function plusValueParticuliers(o) {
    var P = R.PV_PARTICULIERS;
    var frais = Math.max(o.fraisAcqDejaDeduits ? 0 : o.fraisAcqReels, P.forfaitFraisAcquisition * o.prix);
    var travaux = o.travauxDejaDeduits ? 0 : o.travauxReels;
    if (o.forfaitTravaux && o.detention > 5) travaux = Math.max(travaux, P.forfaitTravaux * o.prix);
    var prixAcq = o.prix + frais + travaux - (o.amortReintegres || 0);
    var pvBrute = Math.max(0, o.prixCession - prixAcq) * o.part;
    var ab = abattementsDuree(o.detention);
    var baseIR = pvBrute * (1 - ab.ir), basePS = pvBrute * (1 - ab.ps);
    var ir = baseIR * P.tauxIR, ps = basePS * o.tauxPS, surtaxe = surtaxePV(baseIR);
    return {
      prixAcquisitionCorrige: prixAcq, pvBrute: pvBrute, abattementIR: ab.ir, abattementPS: ab.ps,
      baseIR: baseIR, basePS: basePS, ir: ir, ps: ps, surtaxe: surtaxe, total: ir + ps + surtaxe
    };
  }

  // ---------------------------------------------------------------------------
  // IS progressif
  // ---------------------------------------------------------------------------
  function impotSocietes(base) {
    if (base <= 0) return 0;
    var I = R.IS;
    return Math.min(base, I.seuilTauxReduit) * I.tauxReduit + Math.max(0, base - I.seuilTauxReduit) * I.tauxNormal;
  }

  // ---------------------------------------------------------------------------
  // TRI (bissection) – flux annuels, flux[0] en t0
  // ---------------------------------------------------------------------------
  function tri(flux) {
    var hasNeg = flux.some(function (f) { return f < 0; }), hasPos = flux.some(function (f) { return f > 0; });
    if (!hasNeg || !hasPos) return null;
    function van(r) { var v = 0; for (var t = 0; t < flux.length; t++) v += flux[t] / Math.pow(1 + r, t); return v; }
    var lo = -0.99, hi = 1, vlo = van(lo), vhi = van(hi);
    while (vlo * vhi > 0 && hi < 100) { hi *= 2; vhi = van(hi); }
    if (vlo * vhi > 0) return null;
    for (var k = 0; k < 200; k++) {
      var mid = (lo + hi) / 2, vm = van(mid);
      if (Math.abs(vm) < 1e-7) return mid;
      if (vlo * vm < 0) { hi = mid; vhi = vm; } else { lo = mid; vlo = vm; }
    }
    return (lo + hi) / 2;
  }

  // ---------------------------------------------------------------------------
  // Données d'exploitation communes (100 % du bien)
  // ---------------------------------------------------------------------------
  function coutProjet(p, avecMobilier) {
    var b = p.bien;
    return b.prix + b.fraisNotaire + b.fraisAgence + b.travaux + (avecMobilier ? b.mobilier : 0) + p.pret.fraisDossierGarantie;
  }

  function exploitation(p, annee, mode) {
    // mode : 'meuble' | 'nu' | 'societe_meuble'
    var L = p.location, C = p.charges, T = R.TYPES_LOCATION[L.type];
    var gL = Math.pow(1 + L.revalorisationLoyer, annee - 1), gC = Math.pow(1 + C.revalorisationCharges, annee - 1);
    var recettes, fraisGestion, charges = 0;
    if (mode === 'nu' || mode === 'nu_societe') {
      recettes = L.loyerNuMensuel * (12 - L.vacanceMois) * gL;
      fraisGestion = recettes * L.fraisGestionNuPct;
      charges = C.taxeFonciere + C.copro * (1 - C.coproRecuperablePct) + C.assurancePNO + C.entretien;
    } else {
      recettes = T.tourisme ? L.prixNuit * 365 * L.tauxOccupation * gL : L.loyerMensuel * (12 - L.vacanceMois) * gL;
      fraisGestion = recettes * L.fraisGestionPct;
      var recup = T.tourisme ? 0 : C.coproRecuperablePct;
      charges = C.taxeFonciere + C.copro * (1 - recup) + C.assurancePNO + C.entretien + C.cfe * facteurCfe(annee) + (T.tourisme ? C.chargesCourteDuree + (C.energie || 0) + (C.internet || 0) : 0);
    }
    charges *= gC;
    var structure = 0;
    if (mode === 'meuble') structure = C.comptableLmnp * gC;
    if (mode === 'societe_meuble' || mode === 'nu_societe') structure = (C.comptableSociete + C.fraisSocieteAnnuels) * gC;
    return { recettes: recettes, fraisGestion: fraisGestion, charges: charges + structure };
  }

  // CFE : non due l'année de création (CGI art. 1478 II), base réduite de moitié l'année suivante
  function facteurCfe(annee) { return annee === 1 ? 0 : annee === 2 ? 0.5 : 1; }

  // Cotisations sociales en courte durée au-delà du seuil (elles remplacent les prélèvements sociaux)
  function cotisationsSociales(p, recettes, resultat) {
    var So = R.SOCIAL, s = p.social || {};
    if (!R.TYPES_LOCATION[p.location.type].tourisme || recettes <= So.seuilCourteDuree) return { applicable: false, montant: 0 };
    var montant;
    if (s.regime === 'general' && recettes <= So.general.plafond) {
      var ab = p.location.type === 'tourisme_classe' ? So.general.abattementClasse : So.general.abattementNonClasse;
      montant = recettes * (1 - ab) * So.general.taux;
    } else {
      montant = Math.max(s.dejaIndependant ? 0 : So.ssi.minimum, Math.max(0, resultat) * So.ssi.taux);
    }
    return { applicable: true, montant: montant };
  }

  // Alerte au franchissement du seuil
  function alerteSeuilSocial(p, annees, alertes) {
    if (!R.TYPES_LOCATION[p.location.type].tourisme) return;
    var seuil = R.SOCIAL.seuilCourteDuree;
    for (var i = 0; i < annees.length; i++) {
      if (annees[i].recettes > seuil) {
        alertes.push('Recettes de courte durée supérieures à ' + seuil.toLocaleString('fr-FR') + ' € à partir de ' + annees[i].annee + ' (' + Math.round(annees[i].recettes).toLocaleString('fr-FR') + ' €) : affiliation à l\'URSSAF et cotisations sociales, estimées selon le régime social choisi (ordre de grandeur à confirmer).');
        return;
      }
    }
  }

  function valeurBien(p, n) {
    var v0 = p.bien.valeurMarche || p.bien.prix;
    return v0 * Math.pow(1 + p.revente.revalorisationBien, n);
  }

  // ---------------------------------------------------------------------------
  // Amortissements : bases (100 % du bien)
  // ---------------------------------------------------------------------------
  function basesAmortissement(p) {
    var b = p.bien, bati = 1 - b.quotePartTerrain;
    var fraisAcq = b.fraisNotaire + b.fraisAgence;
    var baseBati = b.prix * bati + (b.fraisAcquisitionMode === 'amortis' ? fraisAcq * bati : 0);
    var baseTravaux = b.travauxNature === 'amelioration' ? b.travaux : 0;
    return {
      bati: { base: baseBati, duree: b.dureeAmortBati },
      travaux: { base: baseTravaux, duree: b.dureeAmortTravaux },
      mobilier: { base: b.mobilier, duree: b.dureeAmortMobilier },
      baseLocaux: baseBati + baseTravaux
    };
  }

  function dotation(c, annee) { // linéaire, sans prorata temporis
    if (c.base <= 0 || c.duree <= 0) return 0;
    var deja = Math.min(c.base, c.base / c.duree * (annee - 1));
    return Math.min(c.base / c.duree, c.base - deja);
  }

  function versionArticle7(p) {
    var v = R.ARTICLE7_VERSIONS[p.fiscal.article7Version] || R.ARTICLE7_VERSIONS.actuel;
    if (p.fiscal.article7Version === 'personnalise' && p.fiscal.article7Perso) v = deepMerge(v, p.fiscal.article7Perso);
    return v;
  }

  // ---------------------------------------------------------------------------
  // LMNP réel et SARL de famille (même mécanique BIC non professionnelle)
  // ---------------------------------------------------------------------------
  function simulerBicReel(p, id) {
    var estSarl = id === 'sarl_famille';
    var T = R.TYPES_LOCATION[p.location.type];
    var part = p.partFoyer, H = p.horizon, b = p.bien;
    var pret = tableauPret(coutProjet(p, true) - p.pret.apport, p.pret.taux, p.pret.dureeAns, p.pret.tauxAssurance);
    var bases = basesAmortissement(p);
    var v7 = versionArticle7(p);
    var alertes = [];
    var anneeAcq = p.anneeAcquisition;

    var v7Applicable = v7.actif && !(v7.exclureLongueDuree && T.longue);
    var plaf = v7Applicable ? (T.tourisme ? v7.tourisme : v7.classique) : null;
    var tourismeSansAmort = v7Applicable && T.tourisme && v7.tourismeSansAmortSiAcquisDes && anneeAcq >= v7.tourismeSansAmortSiAcquisDes;

    var ardLocaux = 0, ardMob = 0, stockTransitoire = 0, deficits = []; // deficits : {montant, expire}
    var amortLocauxDeduitsCumul = 0, cfCumul = 0;
    var revenu = p.foyer.revenuImposable, parts = p.foyer.parts, pb = p.foyer.partsBase;
    var irSans = impotRevenu(revenu, parts, pb);
    var annees = [];

    for (var n = 1; n <= H; n++) {
      var cal = anneeAcq + n - 1;
      var ex = exploitation(p, n, estSarl ? 'societe_meuble' : 'meuble');
      var lp = lignePret(pret, n);
      var unique = 0;
      if (n === 1) {
        unique += p.pret.fraisDossierGarantie;
        if (b.travauxNature === 'entretien') unique += b.travaux;
        if (b.fraisAcquisitionMode === 'charges') unique += b.fraisNotaire + b.fraisAgence;
      }
      // Grandeurs à la quote-part du foyer
      var recettes = ex.recettes * part;
      var chargesDed = (ex.fraisGestion + ex.charges + lp.interets + lp.assurance + unique) * part;
      var r0 = recettes - chargesDed;

      var dotLocaux = (dotation(bases.bati, n) + dotation(bases.travaux, n)) * part;
      var dotMob = dotation(bases.mobilier, n) * part;
      var v7Actif = v7Applicable && cal >= v7.anneeEffet;
      var perdu = 0;

      if (v7Actif) {
        if (tourismeSansAmort) { perdu += dotLocaux; dotLocaux = 0; }
        var plafondLocaux = Math.min(plaf.plafondTaux * bases.baseLocaux * part, plaf.plafondMontant);
        if (dotLocaux > plafondLocaux) { perdu += dotLocaux - plafondLocaux; dotLocaux = plafondLocaux; }
        if (cal === v7.anneeEffet && (ardLocaux + ardMob) > 0) { // bascule du stock existant
          stockTransitoire = ardLocaux + ardMob; ardLocaux = 0; ardMob = 0;
        }
      }

      var dispoLoc = dotLocaux + (v7Actif && v7.reportSupprime ? 0 : ardLocaux);
      var dispoMob = dotMob + (v7Actif && v7.reportSupprime ? 0 : ardMob);
      var plafondDed = Math.max(0, r0);
      var dispo = dispoLoc + dispoMob;
      var ded = Math.min(dispo, plafondDed);
      var dedLoc = dispo > 0 ? ded * dispoLoc / dispo : 0;
      var dedMob = ded - dedLoc;
      if (v7Actif && v7.reportSupprime) {
        perdu += dispo - ded;
        ardLocaux = 0; ardMob = 0;
      } else {
        ardLocaux = dispoLoc - dedLoc; ardMob = dispoMob - dedMob;
      }
      // Stock transitoire (art. 7) : imputation limitée à X % du résultat
      var dedStock = 0;
      if (v7Actif && stockTransitoire > 0) {
        if (cal <= v7.stockTransitoire.jusqua) {
          dedStock = Math.min(stockTransitoire, v7.stockTransitoire.partResultat * plafondDed, plafondDed - ded);
          stockTransitoire -= dedStock;
        } else { perdu += stockTransitoire; stockTransitoire = 0; }
      }
      amortLocauxDeduitsCumul += dedLoc + dedStock; // approximation : le stock est traité comme des locaux

      var resultat = r0 - ded - dedStock;
      // Déficits BIC non professionnels : report 10 ans sur les BIC non pro
      deficits = deficits.filter(function (d) { return d.expire >= cal; });
      if (resultat < 0) { deficits.push({ montant: -resultat, expire: cal + 10 }); resultat = 0; }
      else {
        for (var k = 0; k < deficits.length && resultat > 0; k++) {
          var u = Math.min(deficits[k].montant, resultat); deficits[k].montant -= u; resultat -= u;
        }
        deficits = deficits.filter(function (d) { return d.montant > 0.005; });
      }
      var ir = impotRevenu(revenu + resultat, parts, pb) - irSans;
      var soc = cotisationsSociales(p, recettes, resultat);
      var ps = soc.applicable ? 0 : resultat * R.PS.bicMeuble;
      var cfai = (ex.recettes - ex.fraisGestion - ex.charges - lp.interets - lp.capital - lp.assurance) * part;
      var cf = cfai - ir - ps - soc.montant;
      cfCumul += cf;

      // Revente à la fin de l'année n
      var prixCession = valeurBien(p, n) * (1 - p.revente.fraisVentePct);
      var pv = plusValueParticuliers({
        prixCession: prixCession, prix: b.prix,
        fraisAcqReels: b.fraisNotaire + b.fraisAgence, fraisAcqDejaDeduits: b.fraisAcquisitionMode === 'charges',
        travauxReels: b.travaux, travauxDejaDeduits: b.travauxNature === 'entretien',
        amortReintegres: amortLocauxDeduitsCumul / part, detention: n, part: part,
        forfaitTravaux: p.fiscal.abattementPVTravauxForfait, tauxPS: R.PS.plusValueImmo
      });
      var netRevente = (prixCession - lp.crdFin) * part - pv.total;

      annees.push({
        n: n, annee: cal, recettes: recettes, charges: chargesDed - (lp.interets + lp.assurance) * part,
        interets: lp.interets * part, assurance: lp.assurance * part, cfai: cfai,
        amortissementDisponible: dispo + dedStock, amortissementDeduit: ded + dedStock, amortissementPerdu: perdu,
        ardStock: ardLocaux + ardMob + stockTransitoire, deficitReporte: sum(deficits.map(function (d) { return d.montant; })),
        resultatFiscal: resultat, impot: { ir: ir, ps: ps, is: 0, cotisations: soc.montant, total: ir + ps + soc.montant }, cf: cf, cfCumul: cfCumul,
        crd: lp.crdFin * part, valeur: valeurBien(p, n) * part,
        revente: { prixCession: prixCession * part, impot: pv.total, detail: pv, net: netRevente },
        amortCumulReintegre: amortLocauxDeduitsCumul
      });
    }

    if (v7Applicable && v7.actif) alertes.push('Article 7 (' + v7.libelle + ') appliqué à partir de ' + v7.anneeEffet + '.');
    if (v7.actif && v7.exclureLongueDuree && T.longue) alertes.push('Location longue durée exclue du plafonnement dans cette version de l\'article 7.');
    if (tourismeSansAmort) alertes.push('Meublé de tourisme acquis à partir de ' + v7.tourismeSansAmortSiAcquisDes + ' : plus d\'amortissement des locaux dans cette version.');
    alerteSeuilSocial(p, annees, alertes);
    if (estSarl) alertes.push('SARL de famille : régime réel obligatoire, frais de structure plus élevés, plafond article 7 apprécié par foyer.');
    return { pret: pret, annees: annees, alertes: alertes, eligible: true };
  }

  // ---------------------------------------------------------------------------
  // LMNP micro-BIC
  // ---------------------------------------------------------------------------
  function simulerMicro(p) {
    var T = R.TYPES_LOCATION[p.location.type], M = R.MICRO_BIC[p.location.type];
    var part = p.partFoyer, b = p.bien, H = p.horizon;
    var pret = tableauPret(coutProjet(p, true) - p.pret.apport, p.pret.taux, p.pret.dureeAns, p.pret.tauxAssurance);
    var revenu = p.foyer.revenuImposable, parts = p.foyer.parts, pb = p.foyer.partsBase;
    var irSans = impotRevenu(revenu, parts, pb);
    var annees = [], alertes = [], eligible = true, cfCumul = 0;

    for (var n = 1; n <= H; n++) {
      var ex = exploitation(p, n, 'meuble'), lp = lignePret(pret, n);
      ex.charges -= p.charges.comptableLmnp * Math.pow(1 + p.charges.revalorisationCharges, n - 1); // pas d'expert-comptable en micro
      var recettes = ex.recettes * part;
      if (recettes > M.seuil) eligible = false;
      var base = Math.max(0, recettes - Math.max(R.MICRO_BIC.abattementMinimum, recettes * M.abattement));
      var soc = cotisationsSociales(p, recettes, base);
      var ir = impotRevenu(revenu + base, parts, pb) - irSans, ps = soc.applicable ? 0 : base * R.PS.bicMeuble;
      var cfai = (ex.recettes - ex.fraisGestion - ex.charges - lp.interets - lp.capital - lp.assurance) * part;
      var cf = cfai - ir - ps - soc.montant; cfCumul += cf;
      var prixCession = valeurBien(p, n) * (1 - p.revente.fraisVentePct);
      var pv = plusValueParticuliers({
        prixCession: prixCession, prix: b.prix, fraisAcqReels: b.fraisNotaire + b.fraisAgence, fraisAcqDejaDeduits: false,
        travauxReels: b.travaux, travauxDejaDeduits: false, amortReintegres: 0, detention: n, part: part,
        forfaitTravaux: p.fiscal.abattementPVTravauxForfait, tauxPS: R.PS.plusValueImmo
      });
      annees.push({
        n: n, annee: p.anneeAcquisition + n - 1, recettes: recettes, charges: (ex.fraisGestion + ex.charges) * part,
        interets: lp.interets * part, assurance: lp.assurance * part, cfai: cfai,
        amortissementDisponible: 0, amortissementDeduit: 0, amortissementPerdu: 0, ardStock: 0, deficitReporte: 0,
        resultatFiscal: base, impot: { ir: ir, ps: ps, is: 0, cotisations: soc.montant, total: ir + ps + soc.montant }, cf: cf, cfCumul: cfCumul,
        crd: lp.crdFin * part, valeur: valeurBien(p, n) * part,
        revente: { prixCession: prixCession * part, impot: pv.total, detail: pv, net: (prixCession - lp.crdFin) * part - pv.total },
        amortCumulReintegre: 0
      });
    }
    alerteSeuilSocial(p, annees, alertes);
    if (!eligible) alertes.push('Recettes supérieures au seuil micro-BIC (' + M.seuil.toLocaleString('fr-FR') + ' €) : régime réel obligatoire.');
    alertes.push('Micro-BIC ' + T.libelle + ' : abattement ' + Math.round(M.abattement * 100) + ' %, seuil ' + M.seuil.toLocaleString('fr-FR') + ' € (seuil apprécié sur l\'ensemble des meublés du foyer).');
    return { pret: pret, annees: annees, alertes: alertes, eligible: eligible };
  }

  // ---------------------------------------------------------------------------
  // SCI à l'IR – location nue, revenus fonciers au réel
  // ---------------------------------------------------------------------------
  function simulerSciIr(p) {
    var T = R.TYPES_LOCATION[p.location.type], D = R.DEFICIT_FONCIER;
    var part = p.partFoyer, b = p.bien, H = p.horizon;
    var pret = tableauPret(coutProjet(p, false) - p.pret.apport, p.pret.taux, p.pret.dureeAns, p.pret.tauxAssurance);
    var revenu = p.foyer.revenuImposable, parts = p.foyer.parts, pb = p.foyer.partsBase;
    var irSans = impotRevenu(revenu, parts, pb);
    var reports = [], annees = [], alertes = [], cfCumul = 0;

    for (var n = 1; n <= H; n++) {
      var cal = p.anneeAcquisition + n - 1;
      var ex = exploitation(p, n, 'nu_societe'), lp = lignePret(pret, n);
      var unique = n === 1 ? p.pret.fraisDossierGarantie + b.travaux : 0; // travaux déductibles en foncier (hors agrandissement)
      var recettes = ex.recettes * part;
      var interets = (lp.interets + lp.assurance + (n === 1 ? p.pret.fraisDossierGarantie : 0)) * part;
      var autres = (ex.fraisGestion + ex.charges + (n === 1 ? b.travaux : 0)) * part;
      var rf = recettes - interets - autres;
      var imputGlobal = 0, rfImposable = 0;
      reports = reports.filter(function (d) { return d.expire >= cal; });
      if (rf < 0) {
        var defInterets = Math.max(0, interets - recettes);
        var defAutres = -rf - defInterets;
        imputGlobal = Math.min(defAutres, D.plafondRevenuGlobal);
        var reportable = defInterets + defAutres - imputGlobal;
        if (reportable > 0) reports.push({ montant: reportable, expire: cal + D.dureeReport });
      } else {
        rfImposable = rf;
        for (var k = 0; k < reports.length && rfImposable > 0; k++) {
          var u = Math.min(reports[k].montant, rfImposable); reports[k].montant -= u; rfImposable -= u;
        }
        reports = reports.filter(function (d) { return d.montant > 0.005; });
      }
      var ir = impotRevenu(revenu + rfImposable - imputGlobal, parts, pb) - irSans;
      var ps = rfImposable * R.PS.revenusFonciers;
      var cfai = (ex.recettes - ex.fraisGestion - ex.charges - lp.interets - lp.capital - lp.assurance) * part;
      var cf = cfai - ir - ps; cfCumul += cf;
      var prixCession = valeurBien(p, n) * (1 - p.revente.fraisVentePct);
      var pv = plusValueParticuliers({
        prixCession: prixCession, prix: b.prix, fraisAcqReels: b.fraisNotaire + b.fraisAgence, fraisAcqDejaDeduits: false,
        travauxReels: b.travaux, travauxDejaDeduits: true, amortReintegres: 0, detention: n, part: part,
        forfaitTravaux: p.fiscal.abattementPVTravauxForfait, tauxPS: R.PS.plusValueImmo
      });
      annees.push({
        n: n, annee: cal, recettes: recettes, charges: autres, interets: lp.interets * part, assurance: lp.assurance * part, cfai: cfai,
        amortissementDisponible: 0, amortissementDeduit: 0, amortissementPerdu: 0, ardStock: 0,
        deficitReporte: sum(reports.map(function (d) { return d.montant; })), deficitImputeGlobal: imputGlobal,
        resultatFiscal: rf, impot: { ir: ir, ps: ps, is: 0, total: ir + ps }, cf: cf, cfCumul: cfCumul,
        crd: lp.crdFin * part, valeur: valeurBien(p, n) * part,
        revente: { prixCession: prixCession * part, impot: pv.total, detail: pv, net: (prixCession - lp.crdFin) * part - pv.total },
        amortCumulReintegre: 0
      });
    }
    alertes.push('SCI à l\'IR : une location meublée habituelle ferait basculer la société à l\'IS (CGI art. 206-2). Ce scénario est donc simulé en location nue (loyer nu saisi, sans mobilier).');
    if (T.tourisme) alertes.push('Comparaison à interpréter avec prudence : le type de location saisi est un meublé de tourisme.');
    alertes.push('Déficit foncier imputé sur le revenu global : location à maintenir jusqu\'au 31/12 de la 3e année suivante (CGI art. 156 I-3°).');
    return { pret: pret, annees: annees, alertes: alertes, eligible: true };
  }

  // ---------------------------------------------------------------------------
  // SCI à l'IS
  // ---------------------------------------------------------------------------
  function simulerSciIs(p) {
    var part = p.partFoyer, b = p.bien, H = p.horizon;
    var pret = tableauPret(coutProjet(p, true) - p.pret.apport, p.pret.taux, p.pret.dureeAns, p.pret.tauxAssurance);
    var bases = basesAmortissement(p);
    var pfu = R.PFU_IR + R.PS.dividendes;
    var deficitIS = 0, tresorerie = 0, cca = p.pret.apport, amortCumul = 0, resNetCumul = 0, divCumul = 0;
    var annees = [], alertes = [], cfCumul = 0;
    // Valeur brute immobilisée (100 %)
    var fraisAcq = b.fraisNotaire + b.fraisAgence;
    var immoBrute = b.prix + (b.fraisAcquisitionMode === 'amortis' ? fraisAcq : 0) + (b.travauxNature === 'amelioration' ? b.travaux : 0) + b.mobilier;

    for (var n = 1; n <= H; n++) {
      var ex = exploitation(p, n, 'societe_meuble'), lp = lignePret(pret, n);
      var unique = 0;
      if (n === 1) {
        unique += p.pret.fraisDossierGarantie;
        if (b.travauxNature === 'entretien') unique += b.travaux;
        if (b.fraisAcquisitionMode === 'charges') unique += fraisAcq;
      }
      var amort = dotation(bases.bati, n) + dotation(bases.travaux, n) + dotation(bases.mobilier, n);
      amortCumul += amort;
      var resultat = ex.recettes - ex.fraisGestion - ex.charges - lp.interets - lp.assurance - unique - amort;
      var base = resultat;
      if (base < 0) { deficitIS += -base; base = 0; }
      else { var u = Math.min(deficitIS, base); deficitIS -= u; base -= u; }
      var is = impotSocietes(base);
      resNetCumul += resultat - is;
      var cfaiSoc = ex.recettes - ex.fraisGestion - ex.charges - lp.interets - lp.capital - lp.assurance;
      tresorerie += cfaiSoc - is;
      // Flux associés
      var fluxAssocie = 0, dividende = 0;
      if (tresorerie < 0) { fluxAssocie -= -tresorerie; cca += -tresorerie; tresorerie = 0; }
      else if (cca > 0) { var r = Math.min(cca, tresorerie); cca -= r; tresorerie -= r; fluxAssocie += r; }
      if (p.sciIs.distribuer && tresorerie > 0) {
        dividende = Math.min(tresorerie, Math.max(0, resNetCumul - divCumul));
        tresorerie -= dividende; divCumul += dividende; fluxAssocie += dividende * (1 - pfu);
      }
      var cf = fluxAssocie * part; cfCumul += cf;

      // Revente fin d'année n puis liquidation
      var prixCession = valeurBien(p, n) * (1 - p.revente.fraisVentePct);
      var vnc = immoBrute - amortCumul;
      var pvPro = prixCession - vnc;
      var baseApres = base + pvPro - (pvPro > 0 ? Math.min(deficitIS, pvPro) : 0);
      var isPV = Math.max(0, impotSocietes(Math.max(0, baseApres)) - is);
      var cashLiquidation = tresorerie + prixCession - lp.crdFin - isPV;
      var remboursementCca = Math.min(cca, Math.max(0, cashLiquidation));
      var boni = cashLiquidation - remboursementCca;
      var impotBoni = boni > 0 ? boni * pfu : 0;
      var netRevente = (remboursementCca + boni - impotBoni) * part;

      annees.push({
        n: n, annee: p.anneeAcquisition + n - 1, recettes: ex.recettes * part, charges: (ex.fraisGestion + ex.charges + unique) * part,
        interets: lp.interets * part, assurance: lp.assurance * part, cfai: cfaiSoc * part,
        amortissementDisponible: amort * part, amortissementDeduit: amort * part, amortissementPerdu: 0, ardStock: 0,
        deficitReporte: deficitIS * part, resultatFiscal: resultat * part,
        impot: { ir: 0, ps: 0, is: is * part, pfu: dividende * pfu * part, total: (is + dividende * pfu) * part },
        cf: cf, cfCumul: cfCumul, tresorerieSociete: tresorerie * part, compteCourant: cca * part,
        crd: lp.crdFin * part, valeur: valeurBien(p, n) * part,
        revente: {
          prixCession: prixCession * part, impot: (isPV + impotBoni) * part,
          detail: { vnc: vnc * part, pvPro: pvPro * part, isPV: isPV * part, boni: boni * part, impotBoni: impotBoni * part },
          net: netRevente
        },
        amortCumulReintegre: amortCumul * part
      });
    }
    alertes.push('SCI à l\'IS : la plus-value est calculée sur la valeur nette comptable (amortissements entièrement repris), sans abattement pour durée de détention.');
    alertes.push('Sortie de trésorerie : remboursement du compte courant non imposé, puis dividendes ou boni de liquidation au PFU (' + Math.round(pfu * 1000) / 10 + ' %).');
    alertes.push('Taux réduit d\'IS de 15 % soumis à conditions (CA < 10 M€, capital libéré détenu à 75 % par des personnes physiques).');
    return { pret: pret, annees: annees, alertes: alertes, eligible: true };
  }

  // ---------------------------------------------------------------------------
  // Orchestration
  // ---------------------------------------------------------------------------
  function indicateurs(res, p) {
    var apportFoyer = p.pret.apport * p.partFoyer;
    res.annees.forEach(function (a, idx) {
      var flux = [-apportFoyer];
      for (var k = 0; k <= idx; k++) flux.push(res.annees[k].cf);
      flux[flux.length - 1] += a.revente.net;
      a.enrichissement = a.cfCumul + a.revente.net - apportFoyer;
      a.tri = tri(flux);
    });
    var cumulImpots = 0;
    res.annees.forEach(function (a) { cumulImpots += a.impot.total; a.impotsCumules = cumulImpots; });
    return res;
  }

  function alertesGlobales(p) {
    var T = R.TYPES_LOCATION[p.location.type], out = [];
    if (T.tourisme) {
      out.push('Meublé de tourisme : vérifier le règlement de copropriété, l\'éventuelle autorisation de changement d\'usage, l\'enregistrement en mairie et le plafond de nuitées fixé par la commune (loi Le Meur).');
      out.push('Le taux d\'occupation et les frais de conciergerie et de plateforme pèsent souvent plus que la fiscalité : tester plusieurs hypothèses.');
    }
    if (p.bien.quotePartTerrain < 0.1) out.push('Quote-part de terrain faible : l\'administration peut la contester, ce qui réduit la base amortissable.');
    out.push('Le stock d\'amortissements réintégré à la revente (LMNP, SARL de famille) alourdit l\'impôt de plus-value depuis le 15/02/2025.');
    out.push('Simulation indicative : barème 2026 figé, sans décote ni réductions d\'impôt, textes en cours de vote. Ne remplace pas un expert-comptable.');
    return out;
  }

  function simuler(paramsPartiels) {
    var p = deepMerge(defaultParams(), paramsPartiels || {});
    var scen = {
      lmnp_micro: simulerMicro(p),
      lmnp_reel: simulerBicReel(p, 'lmnp_reel'),
      sarl_famille: simulerBicReel(p, 'sarl_famille'),
      sci_ir: simulerSciIr(p),
      sci_is: simulerSciIs(p)
    };
    Object.keys(scen).forEach(function (k) {
      indicateurs(scen[k], p);
      scen[k].libelle = R.SCENARIOS[k].libelle;
      scen[k].sources = R.SCENARIOS[k].sources;
    });
    return {
      params: p,
      tmi: tmi(p.foyer.revenuImposable, p.foyer.parts),
      article7: versionArticle7(p),
      alertes: alertesGlobales(p),
      scenarios: scen
    };
  }

  var api = {
    defaultParams: defaultParams, simuler: simuler, deepMerge: deepMerge,
    impotRevenu: impotRevenu, tmi: tmi, tableauPret: tableauPret, abattementsDuree: abattementsDuree,
    surtaxePV: surtaxePV, plusValueParticuliers: plusValueParticuliers, impotSocietes: impotSocietes, tri: tri,
    basesAmortissement: basesAmortissement
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SimLoc = api;
})(this);
