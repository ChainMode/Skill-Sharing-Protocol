# Chapitre 6 : Protocole d'Invocation

## 6.1 Aperçu

L'Invocation Protocol définit comment les consommateurs de skills invoquent à distance les skills découverts. Le protocole adopte un modèle d'invocation asynchrone supportant les requêtes de statut et la récupération des résultats.

## 6.2 Flux d'Invocation

### Modèle d'Invocation en Trois Étapes

| Étape | Méthode HTTP | Point d'accès | Description |
|-------|-------------|---------------|-------------|
| 1. Initier l'invocation | POST | `{invocation_endpoint}` | Soumettre la requête, retourner l'ID d'exécution |
| 2. Interroger le statut | GET | `{status_url}/{execution_id}` | Interroger le statut d'exécution |
| 3. Récupérer le résultat | GET | `{result_url}/{execution_id}` | Récupérer le résultat d'exécution |

### Séquence d'Invocation

```
Consommateur                            Fournisseur
  │                                      │
  │── POST /invoke ──────────────────────→│
  │   {caller, skill_id, inputs}         │
  │                                      │
  │←── 202 Accepted ────────────────────│
  │   {execution_id, status: "accepted"} │
  │                                      │
  │── GET /status/{execution_id} ───────→│
  │                                      │
  │←── {status: "running"} ─────────────│
  │                                      │
  │── GET /status/{execution_id} ───────→│
  │                                      │
  │←── {status: "completed"} ───────────│
  │                                      │
  │── GET /result/{execution_id} ───────→│
  │                                      │
  │←── {output: {...}} ─────────────────│
  │                                      │
```

## 6.3 Format de Requête d'Invocation

```json
{
  "caller": {
    "id": "ifay-instance-001",
    "type": "ifay",
    "credentials": {
      "api_key": "sk-xxxxx"
    }
  },
  "skill_id": "com.example.translate-v1",
  "inputs": {
    "text": "Hello, world!",
    "target_language": "zh-CN"
  },
  "context": {
    "trace_id": "trace-abc-123",
    "priority": "normal",
    "timeout_ms": 30000
  }
}
```

### Champs de la Requête

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `caller` | object | Oui | Information d'identité de l'appelant |
| `caller.id` | string | Oui | Identifiant unique de l'appelant |
| `caller.type` | string | Oui | Type d'appelant (ifay/service/user) |
| `caller.credentials` | object | Non | Identifiants d'authentification |
| `skill_id` | string | Oui | ID du skill cible |
| `inputs` | object | Oui | Paramètres d'entrée (paires clé-valeur) |
| `context` | object | Non | Contexte d'invocation |
| `context.trace_id` | string | Non | ID de trace |
| `context.priority` | string | Non | Priorité (low/normal/high) |
| `context.timeout_ms` | number | Non | Durée de timeout (millisecondes) |

## 6.4 Format de Réponse d'Invocation

```json
{
  "execution_id": "exec-789-xyz",
  "status": "completed",
  "skill_id": "com.example.translate-v1",
  "output": {
    "translated_text": "你好，世界！",
    "source_language": "en",
    "target_language": "zh-CN",
    "confidence": 0.98
  },
  "timestamps": {
    "created_at": "2025-03-20T14:30:00Z",
    "updated_at": "2025-03-20T14:30:02Z",
    "completed_at": "2025-03-20T14:30:02Z"
  }
}
```

### Champs de la Réponse

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `execution_id` | string | Oui | Identifiant unique d'exécution |
| `status` | ExecutionStatus | Oui | Statut d'exécution |
| `skill_id` | string | Oui | ID du skill cible |
| `output` | any | Non | Données de sortie (quand completed) |
| `error` | object | Non | Information d'erreur (quand failed/timeout) |
| `timestamps` | object | Oui | Information d'horodatage |

### Énumération des Statuts d'Exécution

| Statut | Description |
|--------|-------------|
| `accepted` | Requête reçue, en attente d'exécution |
| `running` | En cours d'exécution |
| `completed` | Exécution terminée avec succès |
| `failed` | Exécution échouée |
| `timeout` | Exécution expirée |

## 6.5 Flux d'Authentification

Avant l'invocation, le consommateur vérifie le champ `auth` dans le Skill Descriptor :

```
Consommateur                            Fournisseur
  │                                      │
  │── Lire descriptor.auth ──→           │
  │                                      │
  │   auth.type == "api_key"?            │
  │   → Attacher API Key dans le Header  │
  │                                      │
  │   auth.type == "oauth2"?             │
  │   → Exécuter le flux OAuth 2.0       │
  │                                      │
  │   auth.type == "none"?               │
  │   → Invoquer directement             │
  │                                      │
  │── POST /invoke (avec credentials) ──→│
  │                                      │
```

### Réponse d'Échec d'Authentification

Quand des credentials valides ne sont pas fournis, une erreur 401 est retournée :

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required to invoke this skill",
    "details": {
      "required_auth_type": "oauth2",
      "authorization_url": "https://example.com/oauth/authorize"
    }
  }
}
```

## 6.6 Timeout et Réessai

### Gestion du Timeout

Quand l'exécution du skill dépasse le `timeout_ms` configuré :

```json
{
  "execution_id": "exec-789-xyz",
  "status": "timeout",
  "skill_id": "com.example.translate-v1",
  "error": {
    "code": "EXECUTION_TIMEOUT",
    "message": "Skill execution exceeded the configured timeout of 30000ms",
    "retry": {
      "suggested_delay_ms": 5000,
      "max_attempts": 3
    }
  },
  "timestamps": {
    "created_at": "2025-03-20T14:30:00Z",
    "updated_at": "2025-03-20T14:30:30Z"
  }
}
```

### Stratégie de Réessai

- Les réponses de timeout incluent le délai de réessai suggéré et le nombre maximum de tentatives
- Les consommateurs devraient implémenter des stratégies de réessai avec backoff exponentiel
- Pour les points d'accès injoignables, le backoff exponentiel est recommandé (délai initial × 2^n)
