# Spécification du Protocole de Partage de Compétences

**Statut :** Brouillon  
**Version :** 1.0.0  
**Date :** 2025-01-01  
**Schéma :** [`schema/draft/schema.json`](../../../../schema/draft/schema.json), [`schema/draft/schema.ts`](../../../../schema/draft/schema.ts)

---

## Table des matières

1. [Vue d'ensemble du protocole](#1-vue-densemble-du-protocole)
2. [Terminologie](#2-terminologie)
3. [Spécification du Skill Descriptor](#3-spécification-du-skill-descriptor)
4. [Spécification du mécanisme de découverte](#4-spécification-du-mécanisme-de-découverte)
5. [Spécification du protocole d'invocation](#5-spécification-du-protocole-dinvocation)
6. [Spécification de la gestion des versions](#6-spécification-de-la-gestion-des-versions)
7. [Spécification de la sécurité et de l'authentification](#7-spécification-de-la-sécurité-et-de-lauthentification)
8. [Spécification de la gestion des erreurs](#8-spécification-de-la-gestion-des-erreurs)
9. [Référence du schéma](#9-référence-du-schéma)
10. [Annexe : Exemples complets](#10-annexe--exemples-complets)

---

## 1. Vue d'ensemble du protocole

### 1.1 Objectif

Le Protocole de Partage de Compétences définit un mécanisme décentralisé pour la découverte, la déclaration et l'invocation de compétences à travers Internet. Il permet aux fournisseurs de compétences d'exposer leurs capacités sans dépendre d'une plateforme centralisée, et permet aux consommateurs de compétences (principalement les instances iFay) de découvrir et d'invoquer ces compétences à distance de manière autonome.

### 1.2 Principes de conception

- **Découverte décentralisée :** Les fournisseurs de compétences déclarent leurs compétences sous leur propre domaine. Les consommateurs découvrent les compétences via des Well-Known URI et des URL directes — aucun registre central n'est requis.
- **Auto-description :** Chaque compétence est entièrement décrite par un document Skill Descriptor standardisé contenant ses capacités, son interface et sa méthode d'invocation.
- **Le protocole comme spécification :** Les livrables sont des documents de protocole et des fichiers de définition de schéma, et non une application logicielle.

### 1.3 Architecture

Le protocole suit une architecture décentralisée Fournisseur-Consommateur, analogue au modèle de découverte par hyperliens du web et à la découverte de nœuds dans les réseaux P2P.

```
┌─────────────────────────────────────────────────────┐
│              Skill Provider Domain                   │
│                                                     │
│  /.well-known/skill-sharing  ──► Skill Index        │
│       │                                             │
│       ├──► Skill Descriptor A ──► Invocation EP A   │
│       └──► Skill Descriptor B ──► Invocation EP B   │
└─────────────────────────────────────────────────────┘
        ▲                              ▲
        │ 1. Discovery                 │ 2. Invocation
        │                              │
┌───────┴──────────────────────────────┴──────────────┐
│              Skill Consumer (iFay)                    │
│                                                     │
│  Discovery Client ──► Schema Validator ──► Invoker  │
└─────────────────────────────────────────────────────┘
```

### 1.4 Flux d'interaction du protocole

1. **Phase de découverte :** Le consommateur envoie `GET /.well-known/skill-sharing` au domaine du fournisseur et reçoit un Skill Index contenant les références à toutes les compétences déclarées.
2. **Phase de validation :** Le consommateur valide chaque Skill Descriptor par rapport au schéma du protocole à l'aide d'un Schema Validator.
3. **Phase d'invocation :** Le consommateur envoie une requête POST au point de terminaison d'invocation de la compétence, reçoit un identifiant d'exécution et interroge périodiquement le statut et les résultats.

### 1.5 Livrables

| Livrable | Description |
|---|---|
| Documents de spécification du protocole | Disponibles en 9 langues sous `docs/{lang}/specification/` |
| JSON Schema | `schema/{version}/schema.json` — JSON Schema Draft 2020-12 |
| Définitions de types TypeScript | `schema/{version}/schema.ts` — Interfaces TypeScript strictes |
| Documentation MDX | `schema/{version}/schema.mdx` — Documentation interactive du schéma |

---

## 2. Terminologie

| Terme | Définition |
|---|---|
| **iFay** | Un système de compagnon cognitif intelligent ; le principal consommateur du Protocole de Partage de Compétences, capable de découvrir et d'invoquer des compétences pour augmenter ses propres capacités. |
| **Skill (Compétence)** | Une unité de capacité appelable déclarée conformément à ce protocole, incluant mais sans s'y limiter les plugins, les API, les packs de connaissances et les capacités d'exécution de tâches. |
| **Skill Provider (Fournisseur de compétences)** | Une entité (individu, organisation ou système automatisé) qui déclare et expose des compétences sur Internet. |
| **Skill Consumer (Consommateur de compétences)** | Une entité qui découvre et invoque des compétences ; principalement des instances iFay. |
| **Skill Descriptor (Descripteur de compétence)** | Un document de métadonnées conforme au schéma du protocole qui décrit les capacités, l'interface et la méthode d'invocation d'une compétence. |
| **Discovery Mechanism (Mécanisme de découverte)** | Les méthodes et processus par lesquels un consommateur de compétences localise et découvre des Skill Descriptors dans un réseau décentralisé. |
| **Protocol Schema (Schéma du protocole)** | La spécification formelle définissant la structure des Skill Descriptors, incluant le JSON Schema, les types TypeScript et la documentation MDX. |
| **Skill Registry (Registre de compétences)** | Un service optionnel d'index de compétences utilisé pour accélérer la découverte de compétences ; non requis pour le fonctionnement du protocole. |
| **Invocation Endpoint (Point de terminaison d'invocation)** | Le point d'entrée d'invocation à distance déclaré dans un Skill Descriptor. |
| **Capability Type (Type de capacité)** | Un identifiant de classification pour les compétences : `plugin`, `api`, `knowledge` ou `task`. |
| **Schema Validator (Validateur de schéma)** | Un outil ou composant qui valide la conformité d'un Skill Descriptor par rapport au Protocol Schema. |
| **Protocol Version (Version du protocole)** | L'identifiant de version de la spécification du protocole, suivant le Semantic Versioning. |
| **Well-Known URI** | Le chemin de découverte standardisé `/.well-known/skill-sharing` utilisé pour localiser le Skill Index d'un domaine. |

---

## 3. Spécification du Skill Descriptor

### 3.1 Vue d'ensemble

Un Skill Descriptor est la structure de données centrale du protocole. C'est un document JSON qui décrit entièrement l'identité, les capacités, l'interface, la méthode d'invocation et la politique de contrôle d'accès d'une compétence.

Chaque Skill Descriptor DOIT être validé par rapport au JSON Schema du protocole (`schema/draft/schema.json`) avant d'être considéré comme valide.

### 3.2 Champs obligatoires

Un Skill Descriptor valide DOIT contenir tous les champs suivants :

| Champ | Type | Description |
|---|---|---|
| `protocol` | `ProtocolVersion` | La version du protocole à laquelle ce descripteur est conforme. |
| `id` | `string` | Un identifiant unique global pour la compétence. |
| `name` | `string` | Un nom lisible par l'humain pour la compétence. |
| `version` | `string` | La version de la compétence au format SemVer (ex. : `"1.0.0"`). |
| `capability_type` | `CapabilityType` | La classification de capacité de la compétence. |
| `description` | `string` | Une description lisible par l'humain de ce que fait la compétence. |
| `provider` | `object` | Informations sur le fournisseur de la compétence (DOIT contenir `name`). |
| `endpoint` | `InvocationEndpoint` | La configuration du point de terminaison d'invocation. |
| `inputs` | `ParameterDefinition[]` | Un tableau de définitions de paramètres d'entrée. |
| `output` | `OutputDefinition` | La définition du format de sortie. |
| `auth` | `AuthConfig` | La configuration d'authentification. |
| `access` | `AccessPolicy` | La politique de contrôle d'accès. |

### 3.3 Champs optionnels

| Champ | Type | Description |
|---|---|---|
| `tags` | `string[]` | Étiquettes pour la recherche et la catégorisation. |
| `documentation_url` | `string` | URL vers la documentation de la compétence. |
| `created_at` | `string` | Horodatage de création au format ISO 8601. |
| `updated_at` | `string` | Horodatage de dernière mise à jour au format ISO 8601. |

### 3.4 Types d'énumération

#### 3.4.1 CapabilityType

Définit la classification de la capacité d'une compétence. Valeurs valides :

| Valeur | Description |
|---|---|
| `"plugin"` | Un plugin qui étend les fonctionnalités. |
| `"api"` | Un point de terminaison de service API. |
| `"knowledge"` | Un pack de connaissances ou une source de données. |
| `"task"` | Une capacité d'exécution de tâches (humaine ou automatisée). |

#### 3.4.2 AccessPolicy

Définit la politique de contrôle d'accès pour une compétence. Valeurs valides :

| Valeur | Description |
|---|---|
| `"public"` | Accessible à tous les consommateurs sans restriction. |
| `"restricted"` | Accessible uniquement aux consommateurs authentifiés disposant des permissions appropriées. |
| `"private"` | Masquée des requêtes de découverte non authentifiées ; nécessite une authentification pour la découverte et l'invocation. |

#### 3.4.3 AuthType

Définit la méthode d'authentification requise pour invoquer une compétence. Valeurs valides :

| Valeur | Description |
|---|---|
| `"api_key"` | Authentification par clé API. |
| `"oauth2"` | Authentification OAuth 2.0. |
| `"custom"` | Un mécanisme d'authentification personnalisé. |
| `"none"` | Aucune authentification requise. |

#### 3.4.4 ExecutionStatus

Définit le statut d'exécution d'une invocation de compétence. Valeurs valides :

| Valeur | Description |
|---|---|
| `"accepted"` | La requête d'invocation a été acceptée. |
| `"running"` | La compétence est en cours d'exécution. |
| `"completed"` | L'exécution s'est terminée avec succès. |
| `"failed"` | L'exécution a échoué. |
| `"timeout"` | L'exécution a expiré. |

### 3.5 Définitions des sous-structures

#### 3.5.1 ProtocolVersion

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `version` | `string` | Oui | Chaîne de version au format SemVer (ex. : `"1.0.0"`). |
| `changelog_url` | `string` | Non | URL vers le journal des modifications de la version. |

#### 3.5.2 ParameterDefinition

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `name` | `string` | Oui | Nom du paramètre. |
| `type` | `string` | Oui | Type JSON Schema (ex. : `"string"`, `"number"`, `"object"`). |
| `description` | `string` | Oui | Description lisible par l'humain du paramètre. |
| `required` | `boolean` | Oui | Indique si ce paramètre est obligatoire. |
| `default` | `any` | Non | Valeur par défaut si le paramètre n'est pas fourni. |
| `schema` | `object` | Non | JSON Schema imbriqué pour les types complexes. |

#### 3.5.3 InvocationEndpoint

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `url` | `string` | Oui | L'URL d'invocation. |
| `method` | `string` | Oui | Méthode HTTP. L'une des valeurs suivantes : `"GET"`, `"POST"`, `"PUT"`, `"DELETE"`. |
| `content_type` | `string` | Non | Type de contenu de la requête. Par défaut `"application/json"`. |
| `status_url` | `string` | Non | Modèle de point de terminaison de requête de statut contenant le paramètre substituable `{execution_id}`. |
| `result_url` | `string` | Non | Modèle de point de terminaison de récupération des résultats. |
| `timeout_ms` | `number` | Non | Délai d'expiration de l'invocation en millisecondes. |
| `retry` | `object` | Non | Configuration de nouvelle tentative avec `max_attempts` et `backoff_ms`. |

#### 3.5.4 OutputDefinition

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `content_type` | `string` | Oui | Type MIME de la sortie (ex. : `"application/json"`). |
| `schema` | `object` | Non | JSON Schema décrivant la structure de la sortie. |
| `description` | `string` | Non | Description lisible par l'humain de la sortie. |

#### 3.5.5 AuthConfig

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `type` | `AuthType` | Oui | Le type d'authentification. |
| `description` | `string` | Non | Description lisible par l'humain des exigences d'authentification. |
| `header` | `string` | Non | Nom de l'en-tête pour l'authentification par clé API. |
| `oauth2` | `object` | Non | Configuration OAuth 2.0 (obligatoire lorsque `type` est `"oauth2"`). |
| `custom` | `object` | Non | Configuration d'authentification personnalisée (obligatoire lorsque `type` est `"custom"`). |

**Configuration OAuth2 :**

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `authorization_url` | `string` | Oui | L'URL d'autorisation OAuth 2.0. |
| `token_url` | `string` | Oui | L'URL de jeton OAuth 2.0. |
| `scopes` | `Record<string, string>` | Oui | Portées disponibles sous forme de paires clé-valeur (nom de la portée → description). |

**Configuration d'authentification personnalisée :**

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `instructions` | `string` | Oui | Instructions lisibles par l'humain pour le flux d'authentification personnalisé. |
| `parameters` | `ParameterDefinition[]` | Oui | Paramètres requis pour l'authentification personnalisée. |

### 3.6 Exemple : Skill Descriptor valide

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://example.com/changelog"
  },
  "id": "example-provider/weather-forecast",
  "name": "Weather Forecast",
  "version": "2.1.0",
  "capability_type": "api",
  "description": "Provides weather forecast data for a given location and date range.",
  "provider": {
    "name": "Example Weather Co.",
    "url": "https://weather.example.com",
    "contact": "api-support@example.com"
  },
  "endpoint": {
    "url": "https://api.weather.example.com/v2/forecast",
    "method": "POST",
    "content_type": "application/json",
    "status_url": "https://api.weather.example.com/v2/status/{execution_id}",
    "result_url": "https://api.weather.example.com/v2/result/{execution_id}",
    "timeout_ms": 30000,
    "retry": {
      "max_attempts": 3,
      "backoff_ms": 1000
    }
  },
  "inputs": [
    {
      "name": "location",
      "type": "string",
      "description": "City name or coordinates (lat,lon).",
      "required": true
    },
    {
      "name": "days",
      "type": "number",
      "description": "Number of forecast days (1-14).",
      "required": false,
      "default": 7
    }
  ],
  "output": {
    "content_type": "application/json",
    "description": "JSON object containing forecast data.",
    "schema": {
      "type": "object",
      "properties": {
        "location": { "type": "string" },
        "forecasts": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "date": { "type": "string" },
              "high": { "type": "number" },
              "low": { "type": "number" },
              "condition": { "type": "string" }
            }
          }
        }
      }
    }
  },
  "auth": {
    "type": "api_key",
    "description": "Provide your API key in the X-API-Key header.",
    "header": "X-API-Key"
  },
  "access": "public",
  "tags": ["weather", "forecast", "meteorology"],
  "documentation_url": "https://weather.example.com/docs/api",
  "created_at": "2025-01-15T08:00:00Z",
  "updated_at": "2025-06-20T14:30:00Z"
}
```

---

## 4. Spécification du mécanisme de découverte

### 4.1 Vue d'ensemble

Le mécanisme de découverte définit comment les consommateurs de compétences localisent les Skill Descriptors dans un réseau décentralisé. Trois chemins de découverte sont pris en charge, le Well-Known URI étant la méthode principale.

### 4.2 Chemins de découverte

| Chemin | Méthode | Description |
|---|---|---|
| **Well-Known URI** | `GET /.well-known/skill-sharing` | Méthode de découverte principale. Retourne un Skill Index pour le domaine. |
| **URL directe** | `GET {skill_descriptor_url}` | Récupère un Skill Descriptor spécifique lorsque son URL est déjà connue. |
| **Requête au registre** | `GET {registry_url}/skills?type={capability_type}` | Optionnel. Interroge un Skill Registry pour la récupération groupée de compétences. |

### 4.3 Well-Known URI

#### 4.3.1 Chemin

```
/.well-known/skill-sharing
```

Les fournisseurs de compétences DOIVENT servir un document Skill Index à ce chemin. La réponse DOIT avoir un `Content-Type` de `application/json`.

#### 4.3.2 Structure du Skill Index

Le Skill Index est un document JSON listant toutes les compétences déclarées par un domaine fournisseur.

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `protocol` | `ProtocolVersion` | Oui | La version du protocole. |
| `provider` | `object` | Oui | Informations sur le fournisseur (DOIT contenir `name` ; PEUT contenir `url`). |
| `skills` | `SkillIndexEntry[]` | Oui | Tableau d'entrées de l'index des compétences. |

#### 4.3.3 Structure de SkillIndexEntry

Chaque entrée du Skill Index contient des informations résumées sur une compétence :

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | `string` | Oui | L'identifiant unique de la compétence. |
| `name` | `string` | Oui | Le nom lisible par l'humain de la compétence. |
| `capability_type` | `CapabilityType` | Oui | La classification de capacité de la compétence. |
| `description` | `string` | Oui | Une brève description de la compétence. |
| `descriptor_url` | `string` | Oui | L'URL complète vers le Skill Descriptor complet de la compétence. |
| `access` | `AccessPolicy` | Oui | La politique de contrôle d'accès de la compétence. |
| `version` | `string` | Oui | La version de la compétence. |

#### 4.3.4 Unicité des identifiants de compétence

Tous les identifiants de compétence au sein d'un même Skill Index DOIVENT être uniques. Un Skill Index contenant des identifiants en double est considéré comme invalide.

### 4.4 Contrôle d'accès dans la découverte

Lorsqu'une requête **non authentifiée** est effectuée vers le Well-Known URI :
- Les compétences avec `access: "private"` DOIVENT être exclues de la réponse.
- Les compétences avec `access: "public"` ou `access: "restricted"` DOIVENT être incluses.

Lorsqu'une requête **authentifiée** est effectuée :
- Toutes les compétences (y compris `private`) PEUVENT être incluses, sous réserve de la logique d'autorisation du fournisseur.

### 4.5 Filtrage par type de capacité

Les consommateurs PEUVENT filtrer le Skill Index par `capability_type`. Lors du filtrage :
- Le résultat DOIT contenir uniquement les entrées dont le `capability_type` correspond à la valeur du filtre.
- Toutes les entrées de l'index original correspondant à la valeur du filtre DOIVENT apparaître dans le résultat.

### 4.6 Exemple : Skill Index

```json
{
  "protocol": {
    "version": "1.0.0"
  },
  "provider": {
    "name": "Example Corp",
    "url": "https://example.com"
  },
  "skills": [
    {
      "id": "example-corp/weather-forecast",
      "name": "Weather Forecast",
      "capability_type": "api",
      "description": "Provides weather forecast data.",
      "descriptor_url": "https://example.com/skills/weather-forecast.json",
      "access": "public",
      "version": "2.1.0"
    },
    {
      "id": "example-corp/document-translator",
      "name": "Document Translator",
      "capability_type": "task",
      "description": "Translates documents between languages.",
      "descriptor_url": "https://example.com/skills/document-translator.json",
      "access": "restricted",
      "version": "1.3.0"
    },
    {
      "id": "example-corp/internal-analytics",
      "name": "Internal Analytics",
      "capability_type": "plugin",
      "description": "Internal analytics dashboard plugin.",
      "descriptor_url": "https://example.com/skills/internal-analytics.json",
      "access": "private",
      "version": "0.9.0"
    }
  ]
}
```

> **Remarque :** Lors d'une requête de découverte non authentifiée, l'entrée `"internal-analytics"` (avec `access: "private"`) serait exclue de la réponse.

---

## 5. Spécification du protocole d'invocation

### 5.1 Vue d'ensemble

Le protocole d'invocation définit comment un consommateur de compétences invoque à distance une compétence découverte. Le protocole suit un modèle requête-réponse asynchrone avec interrogation périodique du statut.

### 5.2 Flux d'invocation

```
Consumer                          Provider
   │                                 │
   │  POST {invocation_endpoint}     │
   │  (InvocationRequest)            │
   │────────────────────────────────►│
   │                                 │
   │  202 Accepted                   │
   │  (InvocationResponse:accepted)  │
   │◄────────────────────────────────│
   │                                 │
   │  GET {status_url}/{exec_id}     │
   │────────────────────────────────►│
   │                                 │
   │  200 OK                         │
   │  (InvocationResponse:running)   │
   │◄────────────────────────────────│
   │                                 │
   │  GET {result_url}/{exec_id}     │
   │────────────────────────────────►│
   │                                 │
   │  200 OK                         │
   │  (InvocationResponse:completed) │
   │◄────────────────────────────────│
```

### 5.3 Requête d'invocation

Une InvocationRequest est envoyée par le consommateur pour initier l'exécution d'une compétence.

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `caller` | `object` | Oui | Informations d'identité de l'appelant. |
| `caller.id` | `string` | Oui | Identifiant unique de l'appelant. |
| `caller.type` | `string` | Oui | Type d'appelant (ex. : `"ifay"`, `"service"`, `"user"`). |
| `caller.credentials` | `object` | Non | Identifiants d'authentification. |
| `skill_id` | `string` | Oui | L'identifiant unique de la compétence cible. |
| `inputs` | `Record<string, unknown>` | Oui | Paramètres d'entrée sous forme de paires clé-valeur. |
| `context` | `object` | Non | Contexte d'invocation. |
| `context.trace_id` | `string` | Non | Identifiant de traçage distribué. |
| `context.priority` | `string` | Non | Priorité d'exécution : `"low"`, `"normal"` ou `"high"`. |
| `context.timeout_ms` | `number` | Non | Délai d'expiration côté client en millisecondes. |

#### Exemple : Requête d'invocation

```json
{
  "caller": {
    "id": "ifay-instance-001",
    "type": "ifay",
    "credentials": {
      "api_key": "sk-abc123..."
    }
  },
  "skill_id": "example-corp/weather-forecast",
  "inputs": {
    "location": "Tokyo",
    "days": 5
  },
  "context": {
    "trace_id": "trace-7f3a9b2c",
    "priority": "normal",
    "timeout_ms": 30000
  }
}
```

### 5.4 Réponse d'invocation

Une InvocationResponse est retournée par le fournisseur à chaque étape de l'exécution.

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `execution_id` | `string` | Oui | Identifiant unique pour cette exécution. |
| `status` | `ExecutionStatus` | Oui | Statut d'exécution actuel. |
| `skill_id` | `string` | Oui | L'identifiant de la compétence cible. |
| `output` | `any` | Non | Données de sortie (présentes lorsque `status` est `"completed"`). |
| `error` | `object` | Non | Informations d'erreur (présentes lorsque `status` est `"failed"` ou `"timeout"`). |
| `error.code` | `string` | Oui* | Code d'erreur. |
| `error.message` | `string` | Oui* | Message d'erreur lisible par l'humain. |
| `error.details` | `any` | Non | Détails supplémentaires de l'erreur. |
| `error.retry` | `object` | Non | Suggestion de nouvelle tentative avec `suggested_delay_ms` et `max_attempts`. |
| `timestamps` | `object` | Oui | Horodatages d'exécution. |
| `timestamps.created_at` | `string` | Oui | Date de création de l'exécution (ISO 8601). |
| `timestamps.updated_at` | `string` | Oui | Date de dernière mise à jour de l'exécution (ISO 8601). |
| `timestamps.completed_at` | `string` | Non | Date de fin de l'exécution (ISO 8601). |

> \* Obligatoire lorsque l'objet `error` est présent.

#### Exemple : Réponse d'invocation (Terminée)

```json
{
  "execution_id": "exec-a1b2c3d4",
  "status": "completed",
  "skill_id": "example-corp/weather-forecast",
  "output": {
    "location": "Tokyo",
    "forecasts": [
      {
        "date": "2025-07-01",
        "high": 31,
        "low": 24,
        "condition": "Partly Cloudy"
      },
      {
        "date": "2025-07-02",
        "high": 29,
        "low": 22,
        "condition": "Rain"
      }
    ]
  },
  "timestamps": {
    "created_at": "2025-07-01T10:00:00Z",
    "updated_at": "2025-07-01T10:00:05Z",
    "completed_at": "2025-07-01T10:00:05Z"
  }
}
```

### 5.5 Points de terminaison d'invocation

Le champ `endpoint` du Skill Descriptor définit trois modèles d'URL :

| Point de terminaison | Objectif | Variable de modèle |
|---|---|---|
| `url` | Soumettre la requête d'invocation | — |
| `status_url` | Interroger le statut d'exécution | `{execution_id}` |
| `result_url` | Récupérer le résultat d'exécution | `{execution_id}` |

Les consommateurs DOIVENT remplacer `{execution_id}` par l'identifiant d'exécution réel retourné dans la réponse initiale.

---

## 6. Spécification de la gestion des versions

### 6.1 Semantic Versioning

Le Protocole de Partage de Compétences suit le [Semantic Versioning 2.0.0](https://semver.org/) (SemVer). Toutes les chaînes de version DOIVENT être conformes au format `MAJEUR.MINEUR.CORRECTIF`, où :

- **MAJEUR** — Un entier non négatif. Incrémenté pour les modifications incompatibles du protocole.
- **MINEUR** — Un entier non négatif. Incrémenté pour les ajouts rétrocompatibles.
- **CORRECTIF** — Un entier non négatif. Incrémenté pour les corrections de bogues rétrocompatibles.

Exemples de chaînes de version valides : `"1.0.0"`, `"2.3.1"`, `"0.1.0"`.

### 6.2 Déclaration de version

Chaque Skill Descriptor DOIT déclarer la version du protocole à laquelle il est conforme dans le champ `protocol.version` :

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://example.com/protocol/changelog"
  }
}
```

Le champ optionnel `changelog_url` fournit une référence vers le journal des modifications de la version.

### 6.3 Règles de compatibilité

| Condition | Résultat |
|---|---|
| MAJEUR du descripteur > MAJEUR du consommateur | **Incompatible.** Le consommateur ne peut pas gérer une version majeure plus récente. |
| MAJEUR du descripteur = MAJEUR du consommateur | **Compatible.** Les différences de versions mineures et de correctifs sont rétrocompatibles. |
| MAJEUR du descripteur < MAJEUR du consommateur | **Compatible.** Le consommateur peut gérer les versions majeures antérieures. |

### 6.4 Gestion de l'incompatibilité

Lorsqu'un consommateur rencontre un Skill Descriptor avec une version de protocole incompatible :

1. Le consommateur NE DOIT PAS tenter d'invoquer la compétence.
2. Le consommateur DEVRAIT retourner une erreur `VERSION_INCOMPATIBLE` (voir [Section 8](#8-spécification-de-la-gestion-des-erreurs)).
3. La réponse d'erreur DEVRAIT inclure la plage de versions supportée par le consommateur et la version requise par le descripteur.

### 6.5 Versionnage du schéma

Les fichiers de définition de schéma sont maintenus dans des répertoires versionnés :

```
schema/
├── draft/              # Brouillon de travail actuel
│   ├── schema.json
│   ├── schema.ts
│   └── schema.mdx
└── 2025-10-25/         # Version publiée (basée sur la date)
    ├── schema.json
    ├── schema.ts
    └── schema.mdx
```

Lorsqu'une nouvelle version du protocole est publiée, les schémas brouillons sont copiés dans un nouveau répertoire horodaté.

---

## 7. Spécification de la sécurité et de l'authentification

### 7.1 Vue d'ensemble

Le Protocole de Partage de Compétences fournit un cadre flexible d'authentification et de contrôle d'accès. Les fournisseurs de compétences déclarent leurs exigences de sécurité dans le Skill Descriptor, et les consommateurs sont responsables de satisfaire ces exigences avant l'invocation.

### 7.2 Types d'authentification

#### 7.2.1 Clé API (`api_key`)

La méthode d'authentification la plus simple. Le consommateur fournit une clé API dans un en-tête HTTP spécifié.

```json
{
  "auth": {
    "type": "api_key",
    "description": "Include your API key in the X-API-Key header.",
    "header": "X-API-Key"
  }
}
```

#### 7.2.2 OAuth 2.0 (`oauth2`)

Flux d'authentification OAuth 2.0 standard. Le Skill Descriptor fournit les URL d'autorisation et de jeton ainsi que les portées disponibles.

```json
{
  "auth": {
    "type": "oauth2",
    "description": "OAuth 2.0 authentication required.",
    "oauth2": {
      "authorization_url": "https://auth.example.com/authorize",
      "token_url": "https://auth.example.com/token",
      "scopes": {
        "read:forecast": "Read forecast data",
        "write:preferences": "Update user preferences"
      }
    }
  }
}
```

#### 7.2.3 Personnalisé (`custom`)

Pour les méthodes d'authentification non couvertes par la clé API ou OAuth 2.0. Le descripteur fournit des instructions lisibles par l'humain et les paramètres requis.

```json
{
  "auth": {
    "type": "custom",
    "description": "HMAC-SHA256 signed requests.",
    "custom": {
      "instructions": "Sign the request body with your secret key using HMAC-SHA256 and include the signature in the X-Signature header.",
      "parameters": [
        {
          "name": "secret_key",
          "type": "string",
          "description": "Your HMAC secret key.",
          "required": true
        }
      ]
    }
  }
}
```

#### 7.2.4 Aucun (`none`)

Aucune authentification n'est requise. La compétence est librement accessible.

```json
{
  "auth": {
    "type": "none"
  }
}
```

### 7.3 Politiques de contrôle d'accès

Le contrôle d'accès est déclaré au niveau du Skill Descriptor via le champ `access` :

| Politique | Comportement de découverte | Comportement d'invocation |
|---|---|---|
| `"public"` | Visible dans toutes les réponses de découverte. | Aucune authentification requise (sauf si `auth.type` n'est pas `"none"`). |
| `"restricted"` | Visible dans toutes les réponses de découverte. | Authentification requise ; seuls les consommateurs autorisés peuvent invoquer. |
| `"private"` | Masquée des requêtes de découverte non authentifiées. | Authentification requise ; seuls les consommateurs autorisés peuvent invoquer. |

### 7.4 Flux d'authentification

1. Le consommateur récupère le Skill Descriptor.
2. Le consommateur inspecte le champ `auth` pour déterminer la méthode d'authentification requise.
3. Le consommateur attache les identifiants appropriés à la requête d'invocation.
4. Si les identifiants sont manquants ou invalides, le fournisseur retourne une erreur `401` avec des détails sur la méthode d'authentification requise.
5. Si les identifiants sont valides mais que les permissions sont insuffisantes, le fournisseur retourne une erreur `403`.

---

## 8. Spécification de la gestion des erreurs

### 8.1 Catégories d'erreurs

Le protocole définit sept catégories d'erreurs :

| Catégorie d'erreur | Code | Statut HTTP | Scénario |
|---|---|---|---|
| Erreur de validation | `VALIDATION_ERROR` | N/A (local) | Le Schema Validator détecte un Skill Descriptor invalide. |
| Authentification requise | `AUTH_REQUIRED` | 401 | Des identifiants valides n'ont pas été fournis lors de l'invocation d'une compétence protégée. |
| Permission refusée | `PERMISSION_DENIED` | 403 | Les identifiants sont valides mais les permissions sont insuffisantes. |
| Compétence non trouvée | `SKILL_NOT_FOUND` | 404 | L'identifiant de compétence ou l'URL du descripteur demandé n'existe pas. |
| Expiration de l'invocation | `INVOCATION_TIMEOUT` | 408 / 504 | L'exécution de la compétence a dépassé le délai d'expiration configuré. |
| Point de terminaison inaccessible | `ENDPOINT_UNREACHABLE` | 502 / 503 | Le point de terminaison d'invocation n'a pas pu être atteint. |
| Version incompatible | `VERSION_INCOMPATIBLE` | 422 | La version du protocole du Skill Descriptor est incompatible avec le consommateur. |

### 8.2 Format unifié de réponse d'erreur

Toutes les réponses d'erreur DOIVENT être conformes à la structure suivante :

```json
{
  "error": {
    "code": "<ErrorCode>",
    "message": "<message lisible par l'humain>",
    "details": {},
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 0
    }
  }
}
```

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `error.code` | `string` | Oui | L'un des sept codes d'erreur listés ci-dessus. |
| `error.message` | `string` | Oui | Un message d'erreur lisible par l'humain. |
| `error.details` | `any` | Non | Détails d'erreur supplémentaires spécifiques au contexte. |
| `error.retry` | `object` | Non | Suggestion de nouvelle tentative. |
| `error.retry.suggested_delay_ms` | `number` | Oui* | Délai suggéré avant une nouvelle tentative (millisecondes). |
| `error.retry.max_attempts` | `number` | Oui* | Nombre maximum de tentatives de nouvelle tentative. |

> \* Obligatoire lorsque l'objet `retry` est présent.

### 8.3 Stratégies de gestion des erreurs

#### 8.3.1 Erreur de validation

Retournée localement par le Schema Validator lorsqu'un Skill Descriptor échoue à la validation. Le champ `details` DEVRAIT contenir un tableau comprenant :

- `path` — Le chemin JSON Pointer vers le champ invalide.
- `message` — Une description de l'échec de validation.
- `expected` — La valeur ou le type attendu.
- `actual` — La valeur ou le type réellement trouvé.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid SkillDescriptor document",
    "details": [
      {
        "path": "/capability_type",
        "message": "must be equal to one of the allowed values",
        "expected": ["plugin", "api", "knowledge", "task"],
        "actual": "invalid_type"
      },
      {
        "path": "/endpoint/method",
        "message": "must be equal to one of the allowed values",
        "expected": ["GET", "POST", "PUT", "DELETE"],
        "actual": "PATCH"
      }
    ]
  }
}
```

#### 8.3.2 Authentification requise

Retournée lorsque le consommateur ne fournit pas d'identifiants valides. Le champ `details` DEVRAIT décrire la méthode d'authentification requise pour aider le consommateur à compléter l'authentification automatiquement.

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required to invoke this skill",
    "details": {
      "required_auth_type": "oauth2",
      "authorization_url": "https://auth.example.com/authorize"
    },
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 1
    }
  }
}
```

#### 8.3.3 Permission refusée

Retournée lorsque les identifiants sont valides mais que le consommateur ne dispose pas des permissions requises.

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Insufficient permissions to invoke this skill",
    "details": {
      "required_scopes": ["read:forecast"],
      "granted_scopes": []
    }
  }
}
```

#### 8.3.4 Compétence non trouvée

Retournée lorsque l'identifiant de compétence ou l'URL du descripteur demandé n'existe pas.

```json
{
  "error": {
    "code": "SKILL_NOT_FOUND",
    "message": "Skill 'example-corp/nonexistent' was not found",
    "details": {
      "skill_id": "example-corp/nonexistent"
    }
  }
}
```

#### 8.3.5 Expiration de l'invocation

Retournée lorsque l'exécution de la compétence dépasse le délai d'expiration configuré. Le champ `retry` fournit des indications pour les tentatives de nouvelle tentative.

```json
{
  "error": {
    "code": "INVOCATION_TIMEOUT",
    "message": "Skill execution timed out after 30000ms",
    "details": {
      "timeout_ms": 30000,
      "execution_id": "exec-a1b2c3d4"
    },
    "retry": {
      "suggested_delay_ms": 1000,
      "max_attempts": 3
    }
  }
}
```

#### 8.3.6 Point de terminaison inaccessible

Retournée lorsque le point de terminaison d'invocation ne peut pas être atteint. Les consommateurs DEVRAIENT implémenter des stratégies de nouvelle tentative avec recul exponentiel.

```json
{
  "error": {
    "code": "ENDPOINT_UNREACHABLE",
    "message": "Failed to connect to invocation endpoint",
    "details": {
      "url": "https://api.weather.example.com/v2/forecast",
      "reason": "Connection refused"
    },
    "retry": {
      "suggested_delay_ms": 2000,
      "max_attempts": 3
    }
  }
}
```

#### 8.3.7 Version incompatible

Retournée lorsque la version du protocole du Skill Descriptor est incompatible avec le consommateur. Le champ `details` DEVRAIT inclure à la fois la plage de versions supportée par le consommateur et la version requise par le descripteur.

```json
{
  "error": {
    "code": "VERSION_INCOMPATIBLE",
    "message": "Protocol version 2.0.0 is not compatible with consumer version 1.5.0",
    "details": {
      "descriptor_version": "2.0.0",
      "consumer_version": "1.5.0",
      "supported_major": 1
    }
  }
}
```

---

## 9. Référence du schéma

### 9.1 JSON Schema

La définition de schéma faisant autorité est maintenue sous forme de fichier JSON Schema (Draft 2020-12) :

- **Brouillon :** [`schema/draft/schema.json`](../../../../schema/draft/schema.json)
- **Identifiant du schéma :** `https://ifay.org/schema/draft/skill-sharing-protocol.json`

Le schéma définit les types de niveau supérieur suivants via `$defs` :

| Définition | Description |
|---|---|
| `SkillDescriptor` (racine) | La structure complète du Skill Descriptor. |
| `SkillIndex` | La réponse du Well-Known URI contenant une liste de compétences. |
| `SkillIndexEntry` | Une entrée unique dans le Skill Index. |
| `InvocationRequest` | La structure de requête d'invocation de compétence. |
| `InvocationResponse` | La structure de réponse d'invocation de compétence. |
| `ProtocolVersion` | Informations sur la version du protocole. |
| `CapabilityType` | Énumération des types de capacité. |
| `AccessPolicy` | Énumération des politiques de contrôle d'accès. |
| `AuthType` | Énumération des types d'authentification. |
| `ExecutionStatus` | Énumération des statuts d'exécution. |
| `ParameterDefinition` | Définition des paramètres d'entrée/sortie. |
| `AuthConfig` | Configuration d'authentification. |
| `InvocationEndpoint` | Configuration du point de terminaison d'invocation. |
| `OutputDefinition` | Définition du format de sortie. |

### 9.2 Définitions de types TypeScript

Des interfaces TypeScript sont fournies pour un développement typé :

- **Brouillon :** [`schema/draft/schema.ts`](../../../../schema/draft/schema.ts)

Tous les types TypeScript sont exportés et maintiennent une équivalence sémantique avec les définitions du JSON Schema. Les règles de correspondance sont :

| TypeScript | JSON Schema |
|---|---|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| Type union `"a" \| "b"` | `{ "enum": ["a", "b"] }` |
| `interface` | `{ "type": "object", "properties": {...} }` |
| Champ optionnel `field?` | Absent du tableau `required` |
| `Record<string, T>` | `{ "type": "object", "additionalProperties": {...} }` |
| `unknown` | `{}` (sans contrainte) |

### 9.3 Validation du schéma

Les implémentations DEVRAIENT utiliser le fichier JSON Schema (`schema.json`) avec un validateur conforme à JSON Schema Draft 2020-12 (ex. : [Ajv](https://ajv.js.org/)) pour valider les Skill Descriptors.

Le Schema Validator fournit trois opérations principales :

| Opération | Description |
|---|---|
| `validate(document)` | Valide un document par rapport au schéma. Retourne un résultat avec `valid` (booléen) et `errors` (tableau d'erreurs de validation). |
| `parse(document)` | Valide et analyse un document en un objet `SkillDescriptor` typé. Lève une exception en cas d'entrée invalide. |
| `serialize(descriptor)` | Sérialise un objet `SkillDescriptor` en JSON formaté (indentation de 2 espaces). |

---

## 10. Annexe : Exemples complets

### 10.1 Flux complet de découverte et d'invocation

**Étape 1 : Découvrir les compétences via le Well-Known URI**

```http
GET /.well-known/skill-sharing HTTP/1.1
Host: skills.example.com
Accept: application/json
```

**Réponse :**

```json
{
  "protocol": { "version": "1.0.0" },
  "provider": {
    "name": "Example Skills Provider",
    "url": "https://skills.example.com"
  },
  "skills": [
    {
      "id": "example/text-summarizer",
      "name": "Text Summarizer",
      "capability_type": "api",
      "description": "Summarizes long text into concise paragraphs.",
      "descriptor_url": "https://skills.example.com/skills/text-summarizer.json",
      "access": "public",
      "version": "1.2.0"
    }
  ]
}
```

**Étape 2 : Récupérer le Skill Descriptor complet**

```http
GET /skills/text-summarizer.json HTTP/1.1
Host: skills.example.com
Accept: application/json
```

**Réponse :** Un document Skill Descriptor complet (voir [Section 3.6](#36-exemple--skill-descriptor-valide) pour la structure complète).

**Étape 3 : Valider le Skill Descriptor**

Le consommateur valide le document récupéré par rapport à `schema/draft/schema.json` à l'aide d'un Schema Validator. Si la validation échoue, le consommateur NE DOIT PAS invoquer la compétence.

**Étape 4 : Invoquer la compétence**

```http
POST /api/v1/summarize HTTP/1.1
Host: skills.example.com
Content-Type: application/json

{
  "caller": {
    "id": "ifay-instance-042",
    "type": "ifay"
  },
  "skill_id": "example/text-summarizer",
  "inputs": {
    "text": "The Skill Sharing Protocol defines a decentralized mechanism...",
    "max_length": 100
  },
  "context": {
    "trace_id": "trace-9e8d7c6b",
    "priority": "normal"
  }
}
```

**Réponse (Acceptée) :**

```json
{
  "execution_id": "exec-f5e4d3c2",
  "status": "accepted",
  "skill_id": "example/text-summarizer",
  "timestamps": {
    "created_at": "2025-07-01T12:00:00Z",
    "updated_at": "2025-07-01T12:00:00Z"
  }
}
```

**Étape 5 : Interroger le statut**

```http
GET /api/v1/status/exec-f5e4d3c2 HTTP/1.1
Host: skills.example.com
```

**Réponse (Terminée) :**

```json
{
  "execution_id": "exec-f5e4d3c2",
  "status": "completed",
  "skill_id": "example/text-summarizer",
  "output": {
    "summary": "The Skill Sharing Protocol enables decentralized skill discovery and invocation across the internet."
  },
  "timestamps": {
    "created_at": "2025-07-01T12:00:00Z",
    "updated_at": "2025-07-01T12:00:02Z",
    "completed_at": "2025-07-01T12:00:02Z"
  }
}
```

### 10.2 Exemple de réponse d'erreur

**Invocation d'une compétence sans authentification :**

```http
POST /api/v1/forecast HTTP/1.1
Host: api.weather.example.com
Content-Type: application/json

{
  "caller": { "id": "ifay-001", "type": "ifay" },
  "skill_id": "example-corp/weather-forecast",
  "inputs": { "location": "Berlin" }
}
```

**Réponse (401) :**

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required to invoke this skill",
    "details": {
      "required_auth_type": "api_key",
      "header": "X-API-Key"
    },
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 1
    }
  }
}
```

---

## Licence

Cette spécification fait partie du projet Skill Sharing Protocol. Consultez le fichier [LICENSE](../../../../LICENSE) pour plus de détails.
