# Chapitre 8 : Gestion des Versions

## 8.1 Aperçu

La gestion des versions du protocole assure la compatibilité pendant l'évolution du protocole, permettant aux fournisseurs et consommateurs de skills de transitionner en douceur vers de nouvelles versions.

## 8.2 Versionnage Sémantique

Le protocole suit la spécification Semantic Versioning :

```
MAJOR.MINOR.PATCH
```

| Numéro de Version | Type de Changement | Compatibilité |
|-------------------|-------------------|---------------|
| MAJOR | Changements de protocole incompatibles | Changements cassants ; les consommateurs doivent mettre à jour |
| MINOR | Ajouts de fonctionnalités rétrocompatibles | Les anciens consommateurs continuent de fonctionner |
| PATCH | Corrections de bugs rétrocompatibles | Corrections de documentation, corrections de Schema |

## 8.3 Déclaration de Version

Chaque Skill Descriptor doit déclarer la version du protocole qu'il suit :

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://skill-sharing.org/changelog"
  }
}
```

## 8.4 Règles de Compatibilité de Version

### Détermination de la Compatibilité

```
Version supportée par le consommateur : X.Y.Z
Version du protocole du Descriptor : A.B.C

Condition compatible : A == X (même version majeure)
Condition incompatible : A != X (version majeure différente)
```

### Exemple de Matrice de Compatibilité

| Version Consommateur | Version Descriptor | Compatibilité | Explication |
|---------------------|-------------------|---------------|-------------|
| 1.0.0 | 1.0.0 | ✓ Compatible | Correspondance exacte |
| 1.0.0 | 1.2.0 | ✓ Compatible | Version mineure rétrocompatible |
| 1.0.0 | 1.2.3 | ✓ Compatible | Version patch rétrocompatible |
| 1.0.0 | 2.0.0 | ✗ Incompatible | Version majeure différente |
| 2.0.0 | 1.5.0 | ✗ Incompatible | Version majeure différente |

### Réponse d'Incompatibilité de Version

Quand un consommateur rencontre une version de protocole incompatible :

```json
{
  "error": {
    "code": "VERSION_INCOMPATIBLE",
    "message": "Protocol version 2.0.0 is not compatible with consumer version 1.x",
    "details": {
      "descriptor_version": "2.0.0",
      "consumer_supported_range": "1.x.x",
      "upgrade_url": "https://skill-sharing.org/upgrade-guide"
    }
  }
}
```

## 8.5 Répertoires Schema Versionnés

Les fichiers de définition Schema sont organisés par version :

```
schema/
├── draft/                    # Brouillon actuel en développement
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/              # Version publiée
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

- `draft/` : La dernière version en développement, pouvant contenir des changements instables
- `{date}/` : Versions stables publiées, nommées par date de publication

## 8.6 Journal des Modifications de Version

Le Schema du protocole inclut un chemin de référence vers le journal des modifications (`changelog_url`), documentant les changements pour chaque version :

- Champs ou fonctionnalités nouvellement ajoutés
- Champs ou fonctionnalités dépréciés
- Descriptions des changements cassants
- Guides de migration

## 8.7 Garanties de Rétrocompatibilité

Garanties de rétrocompatibilité pour les mises à jour de version mineure :

1. Les champs obligatoires existants ne sont pas supprimés
2. Les nouveaux champs sont optionnels par défaut
3. La sémantique des champs existants n'est pas modifiée
4. Les domaines de valeurs des types énumérés ne sont pas restreints
5. Les paramètres obligatoires des interfaces existantes ne sont pas augmentés
