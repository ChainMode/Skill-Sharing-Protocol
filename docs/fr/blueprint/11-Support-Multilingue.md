# Chapitre 11 : Support Multilingue

## 11.1 Aperçu

Le protocole cible la communauté mondiale des développeurs, fournissant une documentation du protocole en 9 langues pour garantir que les développeurs de différents horizons linguistiques puissent comprendre précisément la spécification du protocole.

## 11.2 Langues Supportées

| Code Langue | Langue | Chemin du Répertoire | Rôle |
|-------------|--------|---------------------|------|
| `en` | English | `docs/en/` | Langue de base |
| `zh-CN` | Chinois simplifié | `docs/zh-CN/` | Traduction |
| `zh-TW` | Chinois traditionnel | `docs/zh-TW/` | Traduction |
| `ja` | Japonais | `docs/ja/` | Traduction |
| `ko` | Coréen | `docs/ko/` | Traduction |
| `de` | Allemand | `docs/de/` | Traduction |
| `fr` | Français | `docs/fr/` | Traduction |
| `es` | Espagnol | `docs/es/` | Traduction |
| `ru` | Russe | `docs/ru/` | Traduction |

## 11.3 Structure des Répertoires

Chaque langue maintient une structure de répertoires indépendante :

```
docs/{language_code}/
├── specification/
│   ├── draft/                # Document de spécification brouillon
│   │   └── specification.md
│   └── 2025-10-25/          # Document de spécification versionné
│       └── specification.md
├── blueprint/               # Documentation blueprint
│   └── illustration/        # Ressources d'illustration
├── community/               # Documentation communautaire
├── develop/                 # Guides de développement
└── sdk/                     # Documentation SDK
```

## 11.4 Stratégie de Langue de Base

- L'anglais (en) sert de langue de base pour la documentation du protocole
- Tout nouveau contenu est d'abord rédigé en anglais
- Les autres versions linguistiques sont traduites depuis l'anglais
- Quand les documents de la langue de base sont mis à jour, le statut de synchronisation est annoté dans les autres versions linguistiques

## 11.5 Principes de Traduction

1. Les termes techniques sont conservés en anglais (ex. Skill Descriptor, Well-Known URI)
2. Les descriptions conceptuelles sont exprimées dans la langue cible
3. Les commentaires dans les exemples de code sont traduits dans la langue cible
4. La structure du document reste cohérente avec la langue de base
5. Chaque version traduite annote le numéro de version correspondant de la langue de base

## 11.6 Annotation du Statut de Synchronisation

Quand les documents de la langue de base sont mis à jour, les autres versions linguistiques devraient annoter le statut de synchronisation dans l'en-tête du document :

```markdown
---
base_version: en/2025-10-25
sync_status: synced | outdated | in_progress
last_synced: 2025-10-25
---
```
