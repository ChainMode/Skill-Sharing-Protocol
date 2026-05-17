# Chapitre 2 : Glossaire

## 2.1 Termes Fondamentaux

| Terme | Anglais | Définition |
|-------|---------|------------|
| iFay | iFay | Système de partenaire cognitif intelligent. Principal consommateur du Skill Sharing Protocol, qui découvre et invoque des skills pour améliorer ses propres capacités |
| Skill | Skill | Unité de capacité invocable déclarée conformément au protocole. Inclut notamment les plugins, APIs, paquets de connaissances et capacités d'exécution de tâches |
| Fournisseur de skills | Skill Provider | Entité (personne, organisation ou système automatisé) qui déclare et expose des skills sur Internet |
| Consommateur de skills | Skill Consumer | Entité qui découvre et invoque des skills. Principalement des instances iFay |
| Descripteur de skill | Skill Descriptor | Document de métadonnées de skill défini selon le Schema du protocole, décrivant les capacités, interfaces, méthodes d'invocation, etc. |

## 2.2 Termes du Protocole

| Terme | Anglais | Définition |
|-------|---------|------------|
| Mécanisme de découverte | Discovery Mechanism | Méthodes et processus par lesquels les consommateurs de skills localisent et découvrent des Skill Descriptors dans les réseaux décentralisés |
| Schema du protocole | Protocol Schema | Spécification formalisée définissant la structure des Skill Descriptors. Inclut JSON Schema, types TypeScript et documentation MDX |
| Registre de skills | Skill Registry | Service d'index de skills optionnel pour accélérer la découverte de skills, mais pas une condition préalable au fonctionnement du protocole |
| Point d'invocation | Invocation Endpoint | Adresse du point d'entrée pour les appels distants déclarée dans le Skill Descriptor |
| Type de capacité | Capability Type | Identifiant de classification d'un skill. Inclut plugin, api, knowledge, task |
| Schema Validator | Schema Validator | Outil ou composant pour valider la conformité des Skill Descriptors par rapport au Schema du protocole |
| Version du protocole | Protocol Version | Identifiant de version de la spécification du protocole. Suit le Semantic Versioning |

## 2.3 Termes Techniques

| Terme | Anglais | Définition |
|-------|---------|------------|
| Well-Known URI | Well-Known URI | Chemin de découverte standardisé `/.well-known/skill-sharing`. Utilisé pour exposer l'index des skills sous un domaine |
| Index de skills | Skill Index | Document retourné par la Well-Known URI. Contient une liste de références de tous les Skill Descriptors déclarés sous le domaine |
| Versionnage sémantique | Semantic Versioning (SemVer) | Format de numéro de version `MAJOR.MINOR.PATCH`. Utilisé pour la gestion des versions du protocole |
| JSON Schema | JSON Schema | Standard pour décrire les structures de données JSON. Ce protocole utilise Draft 2020-12 |
| Politique d'accès | Access Policy | Niveau de visibilité d'un skill : public (public), restreint (restricted), privé (private) |
| ID d'exécution | Execution ID | Identifiant unique retourné après l'invocation d'un skill. Utilisé pour suivre le statut d'exécution et récupérer les résultats |
