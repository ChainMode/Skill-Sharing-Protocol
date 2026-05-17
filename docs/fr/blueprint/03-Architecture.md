# Chapitre 3 : Architecture

## 3.1 Architecture Globale

Le protocole adopte une architecture Provider-Consumer décentralisée, similaire au modèle de découverte par hyperliens du Web et au mécanisme de découverte de nœuds des réseaux P2P.

```
┌─────────────────────────────────────────────────────────┐
│              Domaine du Fournisseur (Provider Domain)     │
│                                                         │
│  ┌──────────────────────────┐                           │
│  │ /.well-known/skill-sharing│                           │
│  └────────┬─────────────────┘                           │
│           │                                             │
│     ┌─────┴─────┐                                       │
│     ▼           ▼                                       │
│  ┌──────┐   ┌──────┐                                   │
│  │Desc.A│   │Desc.B│                                   │
│  └──┬───┘   └──┬───┘                                   │
│     ▼           ▼                                       │
│  ┌──────┐   ┌──────┐                                   │
│  │Endp.A│   │Endp.B│                                   │
│  └──────┘   └──────┘                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Consommateur de Skills (iFay)                │
│                                                         │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐      │
│  │Discovery   │→ │Schema        │→ │Invocation  │      │
│  │Client      │  │Validator     │  │Client      │      │
│  └────────────┘  └──────────────┘  └────────────┘      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│         Optionnel : Registre de Skills (Skill Registry)  │
│                                                         │
│  ┌────────────────────────────────────┐                 │
│  │          Registry Index            │                 │
│  │  (Références d'index → Descripteurs des fournisseurs)│
│  └────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

## 3.2 Flux d'Interaction du Protocole

### Phase 1 : Découverte de Skills

```
Consommateur (iFay)                  Fournisseur
      │                                  │
      │── GET /.well-known/skill-sharing ─→│
      │                                  │
      │←── Index de Skills (Skill Index) ─│
      │                                  │
      │── Schema Validator parsing ──→    │
      │                                  │
```

### Phase 2 : Invocation de Skills

```
Consommateur (iFay)                  Fournisseur
      │                                  │
      │── POST {invocation_endpoint} ────→│
      │   (Requête d'invocation)          │
      │                                  │
      │←── 202 Accepted ─────────────────│
      │   (Confirmation + ID d'exécution) │
      │                                  │
      │── GET {status_endpoint}/{id} ────→│
      │                                  │
      │←── Statut d'exécution ───────────│
      │   (en cours/terminé/échoué)       │
      │                                  │
      │── GET {result_endpoint}/{id} ────→│
      │                                  │
      │←── Résultat d'exécution ─────────│
      │                                  │
```

## 3.3 Trois Chemins de Découverte

| Chemin | Méthode | Description | Cas d'utilisation |
|--------|---------|-------------|-------------------|
| Well-Known URI | `GET /.well-known/skill-sharing` | Méthode de découverte principale. Retourne l'index de tous les skills sous le domaine | Explorer tous les skills d'un fournisseur |
| URL directe | `GET {skill_descriptor_url}` | Récupération directe quand l'URL du Skill Descriptor est connue | Adresse de skill spécifique connue |
| Requête au registre | `GET {registry_url}/skills?type={type}` | Optionnel. Recherche en masse via le registre | Recherche de skills par type |

## 3.4 Architecture d'Organisation des Fichiers

```
project-root/
├── docs/
│   ├── en/                          # Langue de base (anglais)
│   │   ├── specification/
│   │   │   ├── 2025-11-25/          # Documents versionnés
│   │   │   └── draft/               # Documents brouillon
│   │   ├── blueprint/               # Documents blueprint
│   │   ├── community/               # Documents communautaires
│   │   ├── develop/                 # Guides de développement
│   │   └── sdk/                     # Documents SDK
│   ├── zh-CN/                       # Chinois simplifié
│   ├── zh-TW/                       # Chinois traditionnel
│   ├── ja/                          # Japonais
│   ├── ko/                          # Coréen
│   ├── de/                          # Allemand
│   ├── fr/                          # Français
│   ├── es/                          # Espagnol
│   └── ru/                          # Russe
├── schema/
│   ├── draft/                       # Schema brouillon
│   │   ├── schema.json
│   │   ├── schema.ts
│   │   └── schema.mdx
│   └── 2025-10-25/                  # Schema versionné
│       ├── schema.json
│       ├── schema.ts
│       └── schema.mdx
└── src/                             # Code source des outils
    ├── validator.ts                 # Schema Validator
    ├── discovery.ts                 # Logique du mécanisme de découverte
    ├── invocation.ts                # Logique du protocole d'invocation
    └── version.ts                   # Logique de gestion des versions
```

## 3.5 Responsabilités des Composants

### Discovery Client (Client de découverte)

Responsable de la localisation des Skill Descriptors dans le réseau décentralisé :
- Envoyer des requêtes à la Well-Known URI pour récupérer l'index des skills
- Récupérer les Skill Descriptors connus via URL directe
- Recherche en masse via le registre
- Support des requêtes de filtrage basées sur le type de capacité

### Schema Validator

Responsable de la validation de la conformité des Skill Descriptors :
- Utilise schema.json pour valider les documents Skill Descriptor
- Parse les documents valides en objets Skill Descriptor structurés
- Retourne les champs en violation spécifiques et les raisons pour les documents invalides
- Supporte la sérialisation des objets Skill Descriptor en Pretty Print JSON

### Invocation Client (Client d'invocation)

Responsable de l'invocation distante des skills découverts :
- Construction de requêtes d'invocation standardisées
- Traitement du flux d'authentification
- Gestion des requêtes de statut d'exécution
- Traitement des réponses de timeout et d'erreur
