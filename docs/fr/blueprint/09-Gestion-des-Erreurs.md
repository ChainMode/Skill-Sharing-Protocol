# Chapitre 9 : Gestion des Erreurs

## 9.1 Aperçu

Le protocole définit un mécanisme unifié de gestion des erreurs pour garantir que les consommateurs de skills puissent comprendre précisément les causes d'erreur et prendre des mesures de récupération appropriées.

## 9.2 Classification des Erreurs

| Catégorie d'Erreur | Code d'Erreur | Code HTTP | Scénario |
|-------------------|--------------|-----------|----------|
| Erreur de validation | VALIDATION_ERROR | N/A (local) | Le Schema Validator détecte un Skill Descriptor invalide |
| Échec d'authentification | AUTH_REQUIRED | 401 | Pas de credentials valides lors de l'invocation d'un skill protégé |
| Permissions insuffisantes | PERMISSION_DENIED | 403 | Credentials valides mais pas d'accès au skill |
| Skill non trouvé | SKILL_NOT_FOUND | 404 | L'ID de skill ou l'URL du Descriptor demandé n'existe pas |
| Timeout d'exécution | EXECUTION_TIMEOUT | 408 / 504 | L'exécution du skill dépasse le timeout configuré |
| Point d'accès injoignable | ENDPOINT_UNREACHABLE | 502 / 503 | Le point d'invocation ne peut être atteint |
| Version incompatible | VERSION_INCOMPATIBLE | 422 | La version du protocole du Skill Descriptor est incompatible avec le consommateur |

## 9.3 Format Unifié de Réponse d'Erreur

Toutes les réponses d'erreur suivent une structure unifiée :

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Description d'erreur lisible par l'humain",
    "details": {},
    "retry": {
      "suggested_delay_ms": 0,
      "max_attempts": 0
    }
  }
}
```

### Description des Champs

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `error.code` | string | Oui | Code d'erreur lisible par la machine |
| `error.message` | string | Oui | Description d'erreur lisible par l'humain |
| `error.details` | object | Non | Information contextuelle détaillée de l'erreur |
| `error.retry` | object | Non | Suggestions de réessai |
| `error.retry.suggested_delay_ms` | number | Non | Délai de réessai suggéré (millisecondes) |
| `error.retry.max_attempts` | number | Non | Nombre maximum de tentatives suggéré |

## 9.4 Descriptions Détaillées des Erreurs

### Erreur de Validation

Retournée quand le Schema Validator détecte un document invalide :

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Skill descriptor validation failed",
    "details": {
      "violations": [
        {
          "field": "/capability_type",
          "expected": "one of: plugin, api, knowledge, task",
          "actual": "unknown_type",
          "message": "Invalid enum value"
        },
        {
          "field": "/endpoint/url",
          "expected": "string (URI format)",
          "actual": null,
          "message": "Required field is missing"
        }
      ]
    }
  }
}
```

Caractéristiques :
- Retourne une liste de tous les champs en violation (pas seulement la première erreur)
- Chaque entrée inclut le chemin du champ (format JSON Pointer), la valeur attendue et la valeur réelle

### Échec d'Authentification

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required to invoke this skill",
    "details": {
      "required_auth_type": "oauth2",
      "authorization_url": "https://example.com/oauth/authorize",
      "scopes": ["skill:invoke"]
    }
  }
}
```

### Timeout d'Exécution

```json
{
  "error": {
    "code": "EXECUTION_TIMEOUT",
    "message": "Skill execution exceeded the configured timeout of 30000ms",
    "details": {
      "timeout_ms": 30000,
      "elapsed_ms": 30001
    },
    "retry": {
      "suggested_delay_ms": 5000,
      "max_attempts": 3
    }
  }
}
```

### Point d'Accès Injoignable

```json
{
  "error": {
    "code": "ENDPOINT_UNREACHABLE",
    "message": "Failed to connect to skill endpoint",
    "details": {
      "endpoint_url": "https://api.example.com/skills/translate/invoke",
      "reason": "Connection refused"
    },
    "retry": {
      "suggested_delay_ms": 2000,
      "max_attempts": 5
    }
  }
}
```

### Version Incompatible

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

## 9.5 Stratégies de Réessai

### Backoff Exponentiel

Pour les erreurs réessayables (timeout, point d'accès injoignable), le backoff exponentiel est recommandé :

```
délai = initial_delay × 2^(attempt - 1)
```

Exemple (initial_delay = 1000ms) :
- 1er réessai : 1000ms
- 2e réessai : 2000ms
- 3e réessai : 4000ms
- 4e réessai : 8000ms

### Erreurs Non Réessayables

Les erreurs suivantes ne devraient pas être réessayées :
- `VALIDATION_ERROR` : Le Descriptor doit être corrigé
- `AUTH_REQUIRED` : Des credentials doivent être fournis
- `PERMISSION_DENIED` : Des permissions doivent être obtenues
- `VERSION_INCOMPATIBLE` : Le consommateur doit être mis à jour
