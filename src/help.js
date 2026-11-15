/*
 * Aides contextuelles. Aucune logique : uniquement du contenu.
 * Les bulles sont injectées par index.html à partir de l'id du champ :
 * ajouter une entrée ici suffit à faire apparaître le « ? » à côté du libellé.
 *
 *   'id-du-champ': {
 *     titre : intitulé court
 *     quoi  : ce que c'est, en une ou deux phrases, sans jargon
 *     ou    : où trouver l'information (facultatif)
 *     ordre : ordre de grandeur ou valeur courante (facultatif)
 *   }
 */
(function (root) {
  'use strict';

  var AIDE = {
    // ── Le bien ────────────────────────────────────────────────────────────
    'f-prix': {
      titre: 'Prix d\'achat',
      quoi: 'Le prix du logement seul, hors frais de notaire et hors mobilier. Si le compromis ventile du mobilier, retirez-le ici et saisissez-le dans « Mobilier ».',
      ou: 'Compromis de vente, ligne « prix net vendeur ».'
    },
    'f-notaire': {
      titre: 'Frais de notaire',
      quoi: 'Droits de mutation, émoluments du notaire et formalités. Ils s\'ajoutent au prix et peuvent être amortis avec le bâti ou déduits la première année.',
      ou: 'Estimation du notaire, ou simulateur des Notaires de France.',
      ordre: '7 à 8 % du prix dans l\'ancien, 2 à 3 % dans le neuf.'
    },
    'f-agence': {
      titre: 'Frais d\'agence',
      quoi: 'À saisir seulement s\'ils sont à la charge de l\'acquéreur et ne sont pas déjà compris dans le prix.',
      ou: 'Mandat ou compromis de vente.'
    },
    'f-mobilier': {
      titre: 'Mobilier',
      quoi: 'Meubles et équipements achetés avec le logement ou pour le lancement. Il s\'amortit vite et n\'est pas réintégré dans la plus-value à la revente.',
      ou: 'Liste chiffrée annexée au compromis, ou factures d\'achat.',
      ordre: '3 000 à 8 000 € pour un deux-pièces.'
    },
    'f-terrain': {
      titre: 'Part du terrain',
      quoi: 'La fraction du prix qui correspond au terrain. Elle ne s\'amortit pas : plus elle est élevée, moins vous déduisez chaque année.',
      ou: 'Fixée par l\'expert-comptable selon la commune et le type de bien.',
      ordre: '10 à 20 % en appartement, davantage en centre de grande ville.'
    },
    'f-dbati': {
      titre: 'Durée d\'amortissement du bâti',
      quoi: 'Le nombre d\'années sur lequel le bâti est déduit du résultat. En pratique chaque composant (structure, toiture, installations, agencements) a sa durée : on saisit ici la moyenne.',
      ou: 'Plan d\'amortissement de l\'expert-comptable.',
      ordre: '20 à 30 ans en moyenne.'
    },
    'f-dmob': {
      titre: 'Durée d\'amortissement du mobilier',
      quoi: 'Le nombre d\'années sur lequel le mobilier est déduit.',
      ordre: '5 à 10 ans.'
    },
    'f-travaux': {
      titre: 'Travaux à réaliser',
      quoi: 'Travaux payés à l\'achat et financés avec le bien. Laissez 0 s\'il n\'y en a pas.',
      ou: 'Devis des artisans.'
    },
    'lbl-travaux': {
      titre: 'Nature des travaux',
      quoi: 'Une amélioration (cuisine neuve, rénovation complète) s\'amortit sur plusieurs années. Un entretien ou une réparation se déduit en une fois, l\'année de la dépense.',
      ordre: 'À la revente, les travaux déjà déduits ne majorent pas le prix d\'acquisition.'
    },
    'f-dtrav': {
      titre: 'Durée d\'amortissement des travaux',
      quoi: 'Utilisée seulement pour des travaux d\'amélioration.',
      ordre: '10 à 15 ans.'
    },
    'f-facq': {
      titre: 'Frais d\'acquisition',
      quoi: 'Au réel, les frais de notaire et d\'agence peuvent être amortis avec le bâti ou déduits d\'un coup la première année. La déduction immédiate crée souvent un déficit reportable.',
      ou: 'Choix à faire avec l\'expert-comptable, la première année.'
    },

    // ── Financement ────────────────────────────────────────────────────────
    'f-apport': {
      titre: 'Apport',
      quoi: 'L\'argent que vous mettez vous-même. Le reste du coût (prix, frais, mobilier, travaux) est emprunté.',
      ordre: 'Un apport faible gonfle le rendement affiché mais creuse l\'effort mensuel.'
    },
    'f-duree': {
      titre: 'Durée du prêt',
      quoi: 'Plus elle est longue, plus la mensualité baisse et plus le coût total des intérêts monte.',
      ordre: '20 à 25 ans.'
    },
    'f-taux': {
      titre: 'Taux du crédit',
      quoi: 'Taux nominal annuel, hors assurance. Les intérêts sont déductibles au réel.',
      ou: 'Simulation du courtier ou offre de prêt.'
    },
    'f-assu': {
      titre: 'Assurance emprunteur',
      quoi: 'Exprimée en pourcentage annuel du capital emprunté. Elle est déductible au réel.',
      ou: 'Offre de prêt, ligne « TAEA », ou devis de délégation.',
      ordre: '0,10 à 0,40 % par an selon l\'âge.'
    },
    'f-dossier': {
      titre: 'Frais de dossier et garantie',
      quoi: 'Frais bancaires, caution ou hypothèque, honoraires du courtier. Ils sont financés avec le bien et déduits la première année.',
      ou: 'Offre de prêt et mandat du courtier.',
      ordre: '1 à 3 % du montant emprunté.'
    },

    // ── Location ───────────────────────────────────────────────────────────
    'lbl-type': {
      titre: 'Type de location meublée',
      quoi: 'Il détermine le seuil et l\'abattement du micro-BIC, l\'application de l\'article 7 et le seuil de cotisations sociales. Un meublé de tourisme se loue à la nuit ou à la semaine à une clientèle de passage. Le classement est une démarche volontaire auprès d\'un organisme accrédité.',
      ordre: 'Classement : 150 à 250 €, valable 5 ans.'
    },
    'f-nuit': {
      titre: 'Prix moyen par nuit',
      quoi: 'Le prix moyen encaissé par nuit louée sur l\'année, frais de ménage facturés compris, avant commission de la plateforme.',
      ou: 'Relevés de revenus de l\'ancien propriétaire, ou annonces comparables du quartier.'
    },
    'f-occ': {
      titre: 'Taux d\'occupation',
      quoi: 'La part des 365 nuits de l\'année effectivement louées. C\'est l\'hypothèse qui pèse le plus sur le résultat : testez-en plusieurs.',
      ou: 'Relevés de l\'ancien propriétaire en priorité. Les outils d\'estimation de marché donnent un ordre de grandeur.',
      ordre: 'Souvent 50 à 60 % en moyenne de marché, 70 à 80 % pour une annonce bien gérée.'
    },
    'f-loyer': {
      titre: 'Loyer meublé hors charges',
      quoi: 'Le loyer mensuel sans la provision pour charges, qui ne fait que transiter.',
      ou: 'Estimation d\'une agence, annonces comparables.'
    },
    'f-vac': {
      titre: 'Vacance locative',
      quoi: 'Le nombre de mois par an sans locataire, en moyenne sur la durée.',
      ordre: '0,5 mois par an dans un secteur tendu.'
    },
    'f-gest': {
      titre: 'Frais de gestion',
      quoi: 'En courte durée : commission de la plateforme et, le cas échéant, de la conciergerie. En longue durée : honoraires de l\'agence de gestion. Saisissez 0 si vous gérez seul une location longue.',
      ordre: 'Plateforme seule : environ 16 %. Avec conciergerie : 35 à 40 %. Agence en longue durée : 6 à 8 %.'
    },
    'f-rloy': {
      titre: 'Hausse annuelle des recettes',
      quoi: 'L\'évolution attendue des loyers ou des prix par nuit, chaque année.',
      ordre: '1 à 2 %. Si elle est inférieure à la hausse des charges, le cash-flow s\'érode.'
    },
    'f-nu': {
      titre: 'Loyer nu hors charges',
      quoi: 'Loyer du même bien loué vide. Une SCI à l\'IR ne peut pas louer en meublé de façon habituelle : ce scénario est donc simulé en location nue.',
      ordre: 'Environ 10 à 20 % sous le loyer meublé.'
    },
    'f-gnu': {
      titre: 'Gestion locative',
      quoi: 'Honoraires d\'agence pour la location nue du scénario SCI à l\'IR.'
    },

    // ── Charges ────────────────────────────────────────────────────────────
    'f-tf': {
      titre: 'Taxe foncière',
      quoi: 'Montant annuel, taxe d\'enlèvement des ordures ménagères comprise.',
      ou: 'Dernier avis de taxe foncière du vendeur.'
    },
    'f-copro': {
      titre: 'Charges de copropriété',
      quoi: 'Total annuel des appels de charges, avant récupération sur le locataire.',
      ou: 'Relevé annuel de charges du syndic.'
    },
    'f-recup': {
      titre: 'Part récupérable',
      quoi: 'La fraction des charges de copropriété refacturée au locataire en longue durée (entretien, eau, ascenseur). En courte durée, rien n\'est récupéré.',
      ou: 'Relevé du syndic, colonne « charges locatives ».',
      ordre: '50 à 70 %.'
    },
    'f-pno': {
      titre: 'Assurance propriétaire non occupant',
      quoi: 'Obligatoire en copropriété. En courte durée, vérifiez qu\'elle couvre la location saisonnière.',
      ordre: '150 à 250 € par an.'
    },
    'f-entr': {
      titre: 'Entretien courant',
      quoi: 'Petites réparations et remplacements de l\'année.',
      ordre: '1 à 2 % des recettes en longue durée, davantage en courte durée.'
    },
    'f-cfe': {
      titre: 'Cotisation foncière des entreprises',
      quoi: 'Impôt local dû par tout loueur en meublé. Saisissez le montant d\'une année pleine : le simulateur ne l\'applique pas l\'année de création et la divise par deux l\'année suivante.',
      ou: 'Environ 2 × la base de l\'avis de taxe foncière × le taux de CFE de l\'intercommunalité × 1,03.',
      ordre: 'De 200 € à plus de 1 000 € selon la commune.'
    },
    'f-nrj': {
      titre: 'Électricité et eau',
      quoi: 'En courte durée, les consommations sont à votre charge.',
      ou: 'Le diagnostic de performance énergétique donne une estimation annuelle.'
    },
    'f-net': {
      titre: 'Abonnement internet',
      quoi: 'Indispensable en courte durée, à votre charge.',
      ordre: '300 à 400 € par an.'
    },
    'f-ccd': {
      titre: 'Linge et consommables',
      quoi: 'Renouvellement du linge, produits d\'accueil et d\'entretien, blanchisserie éventuelle.'
    },
    'f-cptl': {
      titre: 'Expert-comptable LMNP',
      quoi: 'Tenue de la comptabilité et liasse fiscale au réel. Non compté dans le scénario micro-BIC.',
      ordre: '150 à 300 € en ligne en autonomie, 400 à 600 € avec accompagnement.'
    },
    'f-cpts': {
      titre: 'Expert-comptable société',
      quoi: 'Comptabilité, bilan et déclarations d\'une SARL de famille ou d\'une SCI.',
      ordre: '1 000 à 2 000 € par an.'
    },
    'f-fsoc': {
      titre: 'Autres frais de société',
      quoi: 'Frais bancaires professionnels, greffe, assemblée annuelle.'
    },
    'f-rch': {
      titre: 'Hausse annuelle des charges',
      quoi: 'Évolution attendue de l\'ensemble des charges, chaque année.',
      ordre: 'Environ 2 %.'
    },

    // ── Foyer fiscal ───────────────────────────────────────────────────────
    'f-rev': {
      titre: 'Revenu net imposable',
      quoi: 'Le revenu du foyer avant cette location. Il sert à situer les revenus locatifs dans le barème : l\'impôt est calculé par différence, avec et sans la location.',
      ou: 'Dernier avis d\'impôt, ligne « Revenu net imposable ».'
    },
    'f-parts': {
      titre: 'Nombre de parts',
      quoi: 'Le quotient familial du foyer. L\'avantage lié aux enfants est plafonné, comme dans le calcul réel.',
      ou: 'Dernier avis d\'impôt.',
      ordre: 'Couple : 2. Avec deux enfants : 3.'
    },
    'f-qp': {
      titre: 'Part du bien détenue par votre foyer',
      quoi: 'Si vous achetez à plusieurs foyers, les résultats sont ramenés à votre part. Le plafond de l\'article 7 s\'apprécie par foyer.'
    },
    'f-soc': {
      titre: 'Régime social',
      quoi: 'Au-delà de 23 000 € de recettes de courte durée par an, des cotisations sociales remplacent les prélèvements sociaux. En régime indépendant, elles portent sur le bénéfice. En régime général, sur les recettes après abattement.',
      ou: 'À confirmer auprès de l\'URSSAF ou de l\'expert-comptable : les taux utilisés sont des ordres de grandeur.'
    },

    // ── Revente ────────────────────────────────────────────────────────────
    'f-acq': {
      titre: 'Année d\'acquisition',
      quoi: 'L\'année de signature de l\'acte. Elle détermine si certaines versions de l\'article 7 s\'appliquent au bien.'
    },
    'f-hor': {
      titre: 'Durée simulée',
      quoi: 'Le nombre d\'années calculées. Chaque année affiche le résultat d\'une revente à cette date.'
    },
    'f-rbien': {
      titre: 'Hausse annuelle du prix du bien',
      quoi: 'Évolution attendue de la valeur du logement. Elle pèse fortement sur l\'enrichissement à la revente.',
      ordre: 'Prudent : 0 à 1 %. Long terme historique : environ 2 %.'
    },
    'f-fvente': {
      titre: 'Frais de vente',
      quoi: 'Honoraires d\'agence et diagnostics à la revente, déduits du prix.',
      ordre: '4 à 6 %.'
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AIDE;
  else root.Aide = AIDE;
})(this);
