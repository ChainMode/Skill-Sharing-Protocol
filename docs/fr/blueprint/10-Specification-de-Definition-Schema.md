# Chapitre 10 : Spécification de Définition Schema

## 10.1 Aperçu

Le protocole fournit des spécifications lisibles par machine à travers trois formats de fichiers de définition Schema, supportant la validation automatisée et la génération de code.

## 10.2 Livrables

| Fichier | Format | Objectif |
|---------|--------|----------|
| `schema.json` | JSON Schema Draft 2020-12 | Validation automatisée, génération de code |
| `schema.ts` | Définitions de types TypeScript | Vérification de types au développement, support IDE |
| `schema.mdx` | Documentation interactive MDX | Documentation lisible, exemples interactifs |

## 10.3 Spécification JSON Schema

### Structure de Base

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://skill-sharing.org/schema/draft/schema.json",
  "title": "Skill Sharing Protocol Schema",
  "description": "Définition Schema complète pour le Skill Sharing Protocol",
  "$defs": {
    "CapabilityType": { ... },
    "AccessPolicy": { ... },
    "AuthType": { ... },
    "ParameterDefinition": { ... },
    "SkillDescriptor": { ... },
    "SkillIndex": { ... },
    "InvocationRequest": { ... },
    "InvocationResponse": { ... }
  }
}
```

### Règles de Correspondance TypeScript vers JSON Schema

| TypeScript | JSON Schema |
|-----------|-------------|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| Type union `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| Champ optionnel `field?` | Pas dans le tableau `required` |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}` (sans contraintes) |

## 10.4 Définitions de Types TypeScript

Le fichier de définition de types TypeScript (`schema.ts`) maintient la cohérence sémantique avec le JSON Schema, fournissant :

- Toutes les définitions de types énumérés
- Toutes les définitions d'interfaces
- Exports de types complets
- Descriptions en commentaires JSDoc

## 10.5 Documentation Interactive MDX

Le document MDX (`schema.mdx`) inclut :

- Aperçu du Schema et guide d'utilisation
- Tableaux de description des champs pour chaque modèle de données
- Exemples de Descriptors valides
- Exemples de Descriptors invalides (montrant les erreurs courantes)
- Tableau comparatif JSON Schema et types TypeScript

## 10.6 Structure de Répertoires Versionnée

```
schema/
├── draft/                    # Version brouillon en développement
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/              # Version stable publiée
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

Règles :
- Le répertoire `draft/` contient toujours la dernière version de développement
- Lors de la publication d'une nouvelle version, le contenu du draft est copié dans un répertoire de version nommé par date
- Quand le JSON Schema est mis à jour, les définitions de types TypeScript et la documentation MDX doivent être mises à jour en synchronisation

## 10.7 Schema Validator

Le Schema Validator effectue la validation de conformité de tout document Skill Descriptor basé sur `schema.json` :

- Utilise la bibliothèque ajv pour charger le JSON Schema
- Valide l'intégrité structurelle du document
- Vérifie les domaines de valeurs des champs énumérés
- Retourne des informations d'erreur détaillées (chemin du champ, valeur attendue, valeur réelle)
- Supporte le parsing (JSON → objet) et la sérialisation (objet → Pretty Print JSON)
