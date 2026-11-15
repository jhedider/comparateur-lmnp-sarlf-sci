# Comparateur LMNP, SARL de famille, SCI

Simulateur d'investissement locatif en ligne : https://jhedider.github.io/comparateur-lmnp-sarlf-sci/

Compare cinq montages fiscaux pour un même investissement locatif en France, année par année, jusqu'à la revente.

- Aucune inscription, aucun serveur : tout est calculé dans le navigateur et rien n'est envoyé.
- Chaque règle de calcul cite le texte de loi qu'elle applique.
- Les textes en cours de vote sont simulables version par version.

> Simulation indicative. Elle ne remplace pas l'avis d'un expert-comptable.

## Ce que le simulateur compare

| Montage | Particularités prises en compte |
|---|---|
| LMNP micro-BIC | Abattement et seuil selon le type de location (loi Le Meur) |
| LMNP au réel | Amortissement limité au résultat, report, réintégration dans la plus-value (LF 2025) |
| SARL de famille à l'IR | Même mécanique que le réel, frais de structure en plus |
| SCI à l'IR | Location nue, déficit foncier imputable sur le revenu global |
| SCI à l'IS | Plus-value sur la valeur nette comptable, compte courant, PFU à la sortie |

L'article 7 du projet de loi de finances 2027, qui plafonne l'amortissement en LMNP, se choisit sur une frise : droit actuel, texte initial, version de la commission, version votée en séance, ou hypothèse personnalisée.

## Ce qu'il montre

- Le cash-flow après impôt, l'enrichissement net et le rendement « si je revends à l'année N ».
- Le passage des recettes au résultat imposable, pour comprendre quand l'impôt apparaît.
- Les amortissements déduits, reportés et perdus.
- Le détail du prêt : intérêts, assurance, capital, coût total.
- La sensibilité du résultat aux hypothèses (occupation, taux, prix de revente).
- Les points de vigilance : seuil de cotisations sociales en courte durée, micro-BIC dépassé, SCI et location meublée.

## Utilisation

Ouvrir `index.html` dans un navigateur. Les paramètres saisis sont mémorisés localement.

## Structure

- `src/regimes.js` : paramètres fiscaux et références légales. C'est le seul fichier à modifier quand un texte change.
- `src/engine.js` : moteur de calcul en fonctions pures, utilisable dans le navigateur et dans Node (`SimLoc.simuler(params)`).
- `src/help.js` : textes des bulles d'aide, une entrée par champ. Ajouter une entrée suffit à faire apparaître le « ? ».
- `index.html` : interface, sans dépendance ni étape de build.
- `test/engine.test.js` : cas de référence.

```
npm test
```

## Conventions de calcul

- Résultats ramenés à la part du bien détenue par le foyer.
- Revente simulée à la fin de chaque année.
- Impôt sur le revenu au barème 2026 avec quotient familial plafonné, sans décote ni réduction d'impôt, barème figé sur toute la durée.
- Prélèvements sociaux : 18,6 % sur les BIC meublés et les dividendes, 17,2 % sur les revenus fonciers et les plus-values immobilières.
- CFE non appliquée l'année de création, réduite de moitié l'année suivante.

## Limites connues

- Amortissement linéaire sans prorata la première année, bâti regroupé en une durée moyenne.
- Cotisations sociales en courte durée : ordres de grandeur, à confirmer auprès de l'URSSAF.
- Stock d'amortissements antérieur à l'article 7 traité comme amortissement des locaux.
- SCI à l'IS : liquidation à la revente, apport en compte courant, taux réduit d'IS supposé applicable.
- Pas de taxes annexes à la CFE, pas de gestion de plusieurs biens.

## Comment il a été construit

Ce projet a été réalisé en quelques jours avec Claude (Anthropic), à partir d'un cahier des charges rédigé en langage courant : recherche des textes, moteur de calcul, tests, interface. Les choix fiscaux ont été confrontés à un cas d'achat réel et aux réponses d'un expert-comptable.

## Licence

MIT.
