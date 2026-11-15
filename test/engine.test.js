// Tests du moteur : node --test test/
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/engine.js');

const near = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (±${tol})`);

test('barème IR 2026 : célibataire 30 000 €', () => {
  // (29579-11600)*11% + (30000-29579)*30% = 1977.69 + 126.3
  near(S.impotRevenu(30000, 1, 1), 2103.99, 0.01);
});

test('barème IR : couple 2 parts = 2 × célibataire à revenu moitié', () => {
  near(S.impotRevenu(80000, 2, 2), 2 * S.impotRevenu(40000, 1, 1), 0.01);
});

test('quotient familial plafonné (3 parts, revenu élevé)', () => {
  const r = 200000;
  const ref = S.impotRevenu(r, 2, 2);
  const avec = S.impotRevenu(r, 3, 2);
  near(ref - avec, 2 * 1807, 0.01); // avantage plafonné à 2 demi-parts × 1 807 €
});

test('TMI', () => {
  assert.equal(S.tmi(50000, 2), 0.11);
  assert.equal(S.tmi(60000, 1), 0.30);
});

test('prêt : mensualité de référence 200 k€ / 20 ans / 3,5 %', () => {
  const t = S.tableauPret(200000, 0.035, 20, 0);
  near(t.mensualite, 1159.92, 0.01);
  near(t.annees[19].crdFin, 0, 0.01);
  near(t.annees.reduce((s, a) => s + a.capital, 0), 200000, 0.01);
});

test('abattements PV : 22 ans exonéré IR, 30 ans exonéré PS', () => {
  assert.equal(S.abattementsDuree(5).ir, 0);
  near(S.abattementsDuree(10).ir, 0.30, 1e-9);
  assert.equal(S.abattementsDuree(22).ir, 1);
  near(S.abattementsDuree(22).ps, 0.28, 1e-9);
  assert.equal(S.abattementsDuree(30).ps, 1);
});

test('surtaxe PV : continuité aux seuils de lissage', () => {
  near(S.surtaxePV(60000), 1200, 0.01);
  assert.equal(S.surtaxePV(50000), 0);
  near(S.surtaxePV(50001), 500.07, 0.01); // saut légal à l'entrée du barème
  near(S.surtaxePV(110000), 3300, 0.01);
  near(S.surtaxePV(300000), 18000, 0.01);
});

test('IS : 15 % puis 25 %', () => {
  near(S.impotSocietes(42500), 6375, 0.01);
  near(S.impotSocietes(52500), 8875, 0.01);
});

test('TRI : 100 → 110 en 1 an = 10 %', () => {
  near(S.tri([-100, 110]), 0.10, 1e-6);
});

test('simulation par défaut : 5 scénarios, horizon respecté, valeurs finies', () => {
  const r = S.simuler();
  const ids = Object.keys(r.scenarios);
  assert.deepEqual(ids, ['lmnp_micro', 'lmnp_reel', 'sarl_famille', 'sci_ir', 'sci_is']);
  for (const id of ids) {
    const a = r.scenarios[id].annees;
    assert.equal(a.length, 25);
    for (const y of a) for (const k of ['cf', 'enrichissement', 'resultatFiscal']) assert.ok(Number.isFinite(y[k]), `${id} ${k}`);
  }
});

test('LMNP réel : l\'amortissement ne crée pas de déficit', () => {
  const r = S.simuler();
  for (const y of r.scenarios.lmnp_reel.annees) assert.ok(y.resultatFiscal >= 0);
});

test('LMNP réel : réintégration des amortissements dans la PV', () => {
  const r = S.simuler({ horizon: 10 });
  const y = r.scenarios.lmnp_reel.annees[9];
  const m = r.scenarios.lmnp_micro.annees[9];
  assert.ok(y.amortCumulReintegre > 0);
  near(m.revente.detail.prixAcquisitionCorrige - y.revente.detail.prixAcquisitionCorrige, y.amortCumulReintegre, 1);
});

test('Article 7 (texte initial) : plafond 1,5 % / 5 000 € pour un meublé de tourisme', () => {
  const p = { fiscal: { article7Version: 'initial' }, bien: { prix: 400000, fraisNotaire: 30000, mobilier: 0 }, location: { prixNuit: 250, tauxOccupation: 0.8 } };
  const r = S.simuler(p);
  const y = r.scenarios.lmnp_reel.annees[1]; // 2028
  const bases = S.basesAmortissement(r.params);
  const plafond = Math.min(0.015 * bases.baseLocaux, 5000);
  assert.ok(y.amortissementDeduit <= plafond + 0.01, `${y.amortissementDeduit} > ${plafond}`);
  assert.ok(y.amortissementPerdu > 0);
});

test('Article 7 : version actuelle = version supprimée en séance', () => {
  const a = S.simuler({ fiscal: { article7Version: 'actuel' } });
  const b = S.simuler({ fiscal: { article7Version: 'assemblee' } });
  near(a.scenarios.lmnp_reel.annees[24].enrichissement, b.scenarios.lmnp_reel.annees[24].enrichissement, 0.01);
});

test('Article 7 version commission : longue durée exclue, tourisme acquis en 2027 sans amortissement des locaux', () => {
  const longue = S.simuler({ location: { type: 'longue_habitation' }, fiscal: { article7Version: 'commission' } });
  const actuel = S.simuler({ location: { type: 'longue_habitation' }, fiscal: { article7Version: 'actuel' } });
  near(longue.scenarios.lmnp_reel.annees[24].enrichissement, actuel.scenarios.lmnp_reel.annees[24].enrichissement, 0.01);

  const tour = S.simuler({ fiscal: { article7Version: 'commission' }, bien: { mobilier: 0 } });
  for (const y of tour.scenarios.lmnp_reel.annees) assert.equal(Math.round(y.amortissementDeduit), 0);
});

test('Article 7 : le plafonnement ne réduit jamais l\'impôt', () => {
  const base = { location: { prixNuit: 140, tauxOccupation: 0.75 } };
  const a = S.simuler({ ...base, fiscal: { article7Version: 'actuel' } });
  const b = S.simuler({ ...base, fiscal: { article7Version: 'initial' } });
  assert.ok(b.scenarios.lmnp_reel.annees[24].impotsCumules >= a.scenarios.lmnp_reel.annees[24].impotsCumules - 0.01);
});

test('micro-BIC non classé : inéligible au-delà de 15 000 €', () => {
  const r = S.simuler({ location: { prixNuit: 120, tauxOccupation: 0.7 } }); // ~30 k€
  assert.equal(r.scenarios.lmnp_micro.eligible, false);
});

test('quote-part 50 % : CF et impôts proportionnels hors effets de barème', () => {
  const a = S.simuler({ partFoyer: 1, foyer: { revenuImposable: 0 } });
  const b = S.simuler({ partFoyer: 0.5, foyer: { revenuImposable: 0 } });
  near(b.scenarios.sci_is.annees[3].cfai, a.scenarios.sci_is.annees[3].cfai / 2, 0.01);
});

test('CFE : nulle l\'année de création, moitié l\'année 2, pleine ensuite', () => {
  const avec = S.simuler({ charges: { cfe: 800, revalorisationCharges: 0 }, foyer: { revenuImposable: 0 } }).scenarios.sci_is.annees;
  const sans = S.simuler({ charges: { cfe: 0, revalorisationCharges: 0 }, foyer: { revenuImposable: 0 } }).scenarios.sci_is.annees;
  near(sans[0].cfai - avec[0].cfai, 0, 0.01);
  near(sans[1].cfai - avec[1].cfai, 400, 0.01);
  near(sans[2].cfai - avec[2].cfai, 800, 0.01);
});

test('alerte au seuil de 23 000 € de recettes en courte durée', () => {
  const haut = S.simuler({ location: { type: 'tourisme_classe', prixNuit: 80, tauxOccupation: 0.85 } }).scenarios.lmnp_reel.alertes.join(' ');
  const bas = S.simuler({ location: { type: 'tourisme_classe', prixNuit: 80, tauxOccupation: 0.5, revalorisationLoyer: 0 } }).scenarios.lmnp_reel.alertes.join(' ');
  const longue = S.simuler({ location: { type: 'longue_habitation', loyerMensuel: 3000 } }).scenarios.lmnp_reel.alertes.join(' ');
  assert.ok(/URSSAF/.test(haut));
  assert.ok(!/URSSAF/.test(bas));
  assert.ok(!/URSSAF/.test(longue));
});

test('cotisations sociales au-delà de 23 000 € en courte durée', () => {
  const base = { location: { type: 'tourisme_classe', prixNuit: 80, tauxOccupation: 0.85, revalorisationLoyer: 0 } };
  const a1 = (extra) => S.simuler(S.deepMerge(base, extra)).scenarios.lmnp_reel.annees[0];
  const ssi = a1({});
  assert.equal(ssi.resultatFiscal, 0);
  near(ssi.impot.cotisations, 1255, 0.01);            // minimum, bénéfice nul
  assert.equal(ssi.impot.ps, 0);                      // remplacent les prélèvements sociaux
  near(a1({ social: { dejaIndependant: true } }).impot.cotisations, 0, 0.01);
  near(a1({ social: { regime: 'general' } }).impot.cotisations, 80 * 365 * 0.85 * 0.13 * 0.476, 0.01);
  near(a1({ location: { tauxOccupation: 0.5 } }).impot.cotisations, 0, 0.01);
  near(ssi.cf, a1({ social: { dejaIndependant: true } }).cf - 1255, 0.01);
});

test('SCI IS : la VNC baisse de l\'amortissement cumulé', () => {
  const r = S.simuler({ horizon: 5 });
  const y = r.scenarios.sci_is.annees[4];
  const p = r.params, b = p.bien;
  const brut = b.prix + b.fraisNotaire + b.fraisAgence + b.travaux + b.mobilier;
  near(y.revente.detail.vnc, brut - y.amortCumulReintegre, 0.01);
});
