# Chapitre 1 : Aperçu et Vision

## 1.1 Contexte du Projet

Le Skill Sharing Protocol est un sous-projet central de l'écosystème iFay. En tant que système de partenaire cognitif intelligent, iFay a besoin d'un moyen standardisé pour découvrir et invoquer des capacités distribuées sur Internet — nous désignons collectivement ces capacités comme des « skills ».

Les modèles actuels d'extension des capacités IA reposent sur des plateformes centralisées (telles que les marketplaces de plugins et les passerelles API), qui introduisent des points de défaillance uniques, un verrouillage de plateforme et des goulots d'étranglement en matière d'innovation. Le Skill Sharing Protocol propose un nouveau paradigme décentralisé : les fournisseurs de skills déclarent et exposent des skills sur Internet en suivant les conventions du protocole, et iFay peut découvrir et invoquer ces skills de manière autonome.

Ce concept est analogue à :
- **Le modèle d'hyperliens du Web** : N'importe qui peut publier du contenu sous son propre domaine, et les moteurs de recherche le découvrent automatiquement
- **Les nœuds décentralisés de la blockchain** : Pas de registre centralisé nécessaire ; les nœuds déclarent et découvrent de manière autonome
- **Les mécanismes de découverte de seeds P2P** : Localisation de ressources dans les réseaux distribués

## 1.2 Philosophie Fondamentale

> Toute capacité exécutable peut devenir un skill invocable.

La portée des « skills » englobe :

| Type | Description | Exemples |
|------|-------------|----------|
| Plugin | Modules fonctionnels intégrables | Plugin de traitement d'images, plugin d'analyse de texte |
| API | Interfaces de services distants | API météo, service de traduction |
| Knowledge | Ressources de connaissances structurées | Base de connaissances de domaine, jeu de données FAQ |
| Task | Tâches exécutables par des humains ou iFay | Revue de code, traduction de documents |

## 1.3 Principes de Conception

1. **Découverte décentralisée** : Les fournisseurs de skills déclarent des skills sous leur propre domaine ; les consommateurs découvrent les skills via des chemins standardisés sans plateformes centralisées
2. **Auto-description** : Chaque skill décrit entièrement ses capacités, interfaces et méthodes d'invocation via un Skill Descriptor standardisé
3. **Le protocole comme spécification** : Les livrables sont des documents de protocole et des fichiers de définition Schema, pas des applications logicielles
4. **Ouvert et inclusif** : Documentation du protocole en 9 langues, ciblant la communauté mondiale des développeurs

## 1.4 Livrables du Projet

Ceci est un projet open-source avec les livrables suivants :

1. **Documents de spécification du protocole** : 9 versions linguistiques (en, zh-CN, zh-TW, ja, ko, de, fr, es, ru)
2. **Fichiers de définition Schema** :
   - JSON Schema (Draft 2020-12)
   - Définitions de types TypeScript
   - Documentation interactive MDX
3. **Schema Validator** : Un outil pour valider la conformité des Skill Descriptors par rapport au Schema du protocole

## 1.5 Public Cible

- **Fournisseurs de skills** : Ceux qui souhaitent exposer leurs capacités comme des skills découvrables et invocables
- **Consommateurs de skills (instances iFay)** : Ceux qui ont besoin de découvrir et d'invoquer des skills externes pour améliorer leurs propres capacités
- **Développeurs d'intégration de protocole** : Ceux qui construisent des outils, SDKs ou plateformes basés sur le protocole
- **Communauté mondiale des développeurs** : Ceux qui participent à la discussion, l'amélioration et l'implémentation du protocole
