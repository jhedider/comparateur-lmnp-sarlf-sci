/*
 * Paramètres fiscaux et références légales.
 * Chaque règle porte sa source pour être affichée dans l'interface.
 * Mettre à jour ce fichier quand un texte évolue (date en tête : MAJ).
 */
(function (root) {
  'use strict';

  var MAJ = '2026-11-11';

  // Barème IR 2026 (revenus 2025), LF 2026 art. 2, CGI art. 197. Seuils par part.
  var BAREME_IR = {
    id: 'ir-2026',
    tranches: [
      { jusqua: 11600, taux: 0 },
      { jusqua: 29579, taux: 0.11 },
      { jusqua: 84577, taux: 0.30 },
      { jusqua: 181917, taux: 0.41 },
      { jusqua: Infinity, taux: 0.45 }
    ],
    plafondDemiPart: 1807, // avantage QF par demi-part supplémentaire
    source: 'Loi n° 2026-103 du 19/02/2026 (LF 2026) – CGI art. 197'
  };

  // Prélèvements sociaux (LFSS 2026, loi n° 2025-1403 ; CSS art. L136-6, L136-7, L136-8)
  var PS = {
    bicMeuble: 0.186,      // BIC LMNP : hausse de CSG appliquée
    revenusFonciers: 0.172, // location nue : exclue de la hausse
    plusValueImmo: 0.172,   // PV immobilières des particuliers : exclues de la hausse
    dividendes: 0.186,      // dividendes / boni : PFU 12,8 % + 18,6 % = 31,4 %
    source: 'LFSS 2026 (loi n° 2025-1403 du 30/12/2025) – CSS art. L136-6 à L136-8'
  };

  var PFU_IR = 0.128; // CGI art. 200 A

  // Micro-BIC (CGI art. 50-0, version loi n° 2024-1039 « Le Meur »)
  var MICRO_BIC = {
    longue_habitation: { seuil: 83600, abattement: 0.50 },
    bail_mobilite: { seuil: 83600, abattement: 0.50 },
    tourisme_classe: { seuil: 83600, abattement: 0.50 },
    tourisme_non_classe: { seuil: 15000, abattement: 0.30 },
    abattementMinimum: 305,
    source: 'CGI art. 50-0 (loi n° 2024-1039 du 19/11/2024, dite loi Le Meur)'
  };

  // Plus-value immobilière des particuliers (CGI art. 150 U à 150 VH, 1609 nonies G)
  var PV_PARTICULIERS = {
    tauxIR: 0.19,
    forfaitFraisAcquisition: 0.075, // si frais réels non retenus
    forfaitTravaux: 0.15,           // si détention > 5 ans
    source: 'CGI art. 150 U, 150 VB, 150 VC, 200 B, 1609 nonies G',
    sourceReintegration: 'CGI art. 150 VB III (LF 2025, loi n° 2025-127, art. 84) – cessions à compter du 15/02/2025'
  };

  // IS (CGI art. 219)
  var IS = {
    tauxReduit: 0.15,
    seuilTauxReduit: 42500,
    tauxNormal: 0.25,
    source: 'CGI art. 219 I-b (taux réduit PME, conditions de CA et de détention du capital)'
  };

  // CFE (CGI art. 1447, 1467, 1478, 1647 D) : valeur locative cadastrale x taux intercommunal
  var CFE = {
    fraisGestion: 0.03,
    source: 'CGI art. 1467 (base : valeur locative), art. 1478 II (exonération l\'année de création, base réduite de moitié l\'année suivante), art. 1647 D (cotisation minimum)'
  };

  // Cotisations sociales : seuil d'affiliation pour la location meublée de courte durée
  var SOCIAL = {
    seuilCourteDuree: 23000,
    // Ordres de grandeur, à confirmer auprès de l'URSSAF
    ssi: { taux: 0.40, minimum: 1255 },
    general: { taux: 0.476, abattementClasse: 0.87, abattementNonClasse: 0.60, plafond: 83600 },
    source: 'CSS art. L611-1 6° et L311-3 35° (recettes de courte durée supérieures à 23 000 € : cotisations sociales)'
  };

  // Déficit foncier (CGI art. 156 I-3°)
  var DEFICIT_FONCIER = {
    plafondRevenuGlobal: 10700,
    dureeReport: 10,
    source: 'CGI art. 156 I-3°'
  };

  /*
   * Versions de l'article 7 du PLF 2027 (n° 3210), modifiant CGI art. 39 C.
   * Chaque version est un jeu de paramètres ; « actuel » = droit en vigueur.
   *  - plafondTaux / plafondMontant : par type « classique » ou « tourisme »
   *  - exclureLongueDuree : bail d'habitation meublé et bail mobilité hors champ
   *  - tourismeSansAmortSiAcquisDes : année d'acquisition à partir de laquelle
   *    un meublé de tourisme en LMNP n'est plus amortissable
   *  - reportSupprime : amortissement non déduit perdu (au lieu de reporté)
   *  - stockTransitoire : stock d'ARD antérieur imputable à hauteur de X % du
   *    résultat jusqu'à l'année indiquée, perdu au-delà
   */
  var ARTICLE7_VERSIONS = {
    actuel: {
      libelle: 'Droit actuel (LF 2025, sans article 7)',
      actif: false,
      source: 'CGI art. 39 C II (amortissement limité au résultat, excédent reportable sans limite)'
    },
    initial: {
      libelle: 'PLF 2027 – texte initial (01/10/2026), transmis au Sénat après le rejet du 04/11/2026',
      actif: true,
      anneeEffet: 2027,
      classique: { plafondTaux: 0.025, plafondMontant: 7000 },
      tourisme: { plafondTaux: 0.015, plafondMontant: 5000 },
      exclureLongueDuree: false,
      tourismeSansAmortSiAcquisDes: null,
      reportSupprime: true,
      stockTransitoire: { partResultat: 0.5, jusqua: 2036 },
      source: 'PLF 2027 n° 3210, art. 7 (texte déposé le 01/10/2026)'
    },
    commission: {
      libelle: 'PLF 2027 – version commission des finances (08/10/2026)',
      actif: true,
      anneeEffet: 2027,
      classique: { plafondTaux: 0.025, plafondMontant: 7000 },
      tourisme: { plafondTaux: 0.015, plafondMontant: 5000 },
      exclureLongueDuree: true,
      tourismeSansAmortSiAcquisDes: 2027,
      reportSupprime: true,
      stockTransitoire: { partResultat: 0.5, jusqua: 2036 },
      source: 'PLF 2027 art. 7 + amendements I-CF1588 et I-CF776 (commission, 08/10/2026)'
    },
    assemblee: {
      libelle: 'PLF 2027 – après séance AN (30/10/2026) : plafonnement supprimé (version caduque, première partie rejetée le 04/11/2026)',
      actif: false,
      source: 'Amendements I-96, I-114, I-116 adoptés le 30/10/2026 (suppression des alinéas 7 à 24 de l\'art. 7)'
    },
    personnalise: {
      libelle: 'Personnalisé',
      actif: true,
      anneeEffet: 2027,
      classique: { plafondTaux: 0.025, plafondMontant: 7000 },
      tourisme: { plafondTaux: 0.015, plafondMontant: 5000 },
      exclureLongueDuree: false,
      tourismeSansAmortSiAcquisDes: null,
      reportSupprime: true,
      stockTransitoire: { partResultat: 0.5, jusqua: 2036 },
      source: 'Paramètres saisis'
    }
  };

  var TYPES_LOCATION = {
    longue_habitation: { libelle: 'Bail meublé d\'habitation (longue durée)', tourisme: false, longue: true },
    bail_mobilite: { libelle: 'Bail mobilité (1 à 10 mois)', tourisme: false, longue: true },
    tourisme_classe: { libelle: 'Meublé de tourisme classé', tourisme: true, longue: false },
    tourisme_non_classe: { libelle: 'Meublé de tourisme non classé', tourisme: true, longue: false }
  };

  var SCENARIOS = {
    lmnp_micro: { libelle: 'LMNP micro-BIC', sources: ['CGI art. 50-0', 'CGI art. 150 U'] },
    lmnp_reel: { libelle: 'LMNP réel', sources: ['CGI art. 39 C', 'CGI art. 150 VB III'] },
    sarl_famille: {
      libelle: 'SARL de famille (IR)',
      sources: ['CGI art. 239 bis AA', 'CGI art. 50-0 2-c (micro exclu)', 'CGI art. 151 septies VII (PV des particuliers pour LMNP)']
    },
    sci_ir: { libelle: 'SCI à l\'IR (location nue)', sources: ['CGI art. 8, 28, 31', 'CGI art. 156 I-3°'] },
    sci_is: { libelle: 'SCI à l\'IS', sources: ['CGI art. 206', 'CGI art. 219', 'CGI art. 200 A (PFU)'] }
  };

  var api = {
    MAJ: MAJ,
    BAREME_IR: BAREME_IR,
    PS: PS,
    PFU_IR: PFU_IR,
    MICRO_BIC: MICRO_BIC,
    PV_PARTICULIERS: PV_PARTICULIERS,
    IS: IS,
    DEFICIT_FONCIER: DEFICIT_FONCIER,
    CFE: CFE,
    SOCIAL: SOCIAL,
    ARTICLE7_VERSIONS: ARTICLE7_VERSIONS,
    TYPES_LOCATION: TYPES_LOCATION,
    SCENARIOS: SCENARIOS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Regimes = api;
})(this);
