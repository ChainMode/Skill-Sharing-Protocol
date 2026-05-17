# Chapitre 4 : Descripteur de Compétence

## 4.1 Aperçu

Le Skill Descriptor est la structure de données centrale du protocole, existant sous forme de document JSON qui décrit entièrement les métadonnées d'un skill. Il sert de contrat entre les fournisseurs et les consommateurs de skills — les fournisseurs déclarent les capacités d'un skill via le Descriptor, et les consommateurs comprennent comment invoquer le skill à travers celui-ci.

## 4.2 Définitions Complètes des Champs

### Champs Obligatoires

| Champ | Type | Description |
|-------|------|-------------|
| `protocol` | ProtocolVersion | Information de version du protocole |
| `id` | string | Identifiant unique du skill |
| `name` | string | Nom du skill |
| `version` | string | Version du skill (format SemVer) |
| `capability_type` | CapabilityType | Type de capacité |
| `description` | string | Description du skill |
| `provider` | object | Information du fournisseur |
| `endpoint` | InvocationEndpoint | Configuration du point d'invocation |
| `inputs` | ParameterDefinition[] | Définitions des paramètres d'entrée |
| `output` | OutputDefinition | Définition du format de sortie |
| `auth` | AuthConfig | Configuration d'authentification |
| `access` | AccessPolicy | Politique de contrôle d'accès |

### Champs Optionnels

| Champ | Type | Description |
|-------|------|-------------|
| `tags` | string[] | Tags (pour recherche et classification) |
| `documentation_url` | string | URL de documentation du skill |
| `created_at` | string | Date de création (ISO 8601) |
| `updated_at` | string | Date de mise à jour (ISO 8601) |

## 4.3 Types Énumérés

### CapabilityType

```json
["plugin", "api", "knowledge", "task"]
```

- `plugin` : Module fonctionnel intégrable
- `api` : Interface de service distant
- `knowledge` : Ressource de connaissances structurée
- `task` : Tâche exécutable par un humain ou iFay

### AccessPolicy

```json
["public", "restricted", "private"]
```

- `public` : Ouvert ; tout le monde peut découvrir et invoquer
- `restricted` : Découvrable mais l'invocation nécessite une authentification
- `private` : Non découvrable sans authentification

### AuthType

```json
["api_key", "oauth2", "custom", "none"]
```

## 4.4 Définitions des Sous-structures

### ProtocolVersion

```json
{
  "version": "1.0.0",
  "changelog_url": "https://example.com/changelog"
}
```

- `version` (obligatoire) : Numéro de version du protocole au format SemVer
- `changelog_url` (optionnel) : URL du journal des modifications

### InvocationEndpoint

```json
{
  "url": "https://example.com/skills/translate/invoke",
  "method": "POST",
  "content_type": "application/json",
  "status_url": "https://example.com/skills/translate/status/{execution_id}",
  "result_url": "https://example.com/skills/translate/result/{execution_id}",
  "timeout_ms": 30000,
  "retry": {
    "max_attempts": 3,
    "backoff_ms": 1000
  }
}
```

### ParameterDefinition

```json
{
  "name": "text",
  "type": "string",
  "description": "Texte à traduire",
  "required": true,
  "default": null,
  "schema": { "minLength": 1, "maxLength": 10000 }
}
```

### AuthConfig

Exemple d'authentification API Key :
```json
{
  "type": "api_key",
  "description": "Transmettre l'API Key via HTTP Header",
  "header": "X-API-Key"
}
```

Exemple d'authentification OAuth 2.0 :
```json
{
  "type": "oauth2",
  "oauth2": {
    "authorization_url": "https://example.com/oauth/authorize",
    "token_url": "https://example.com/oauth/token",
    "scopes": {
      "skill:invoke": "Invoquer le skill",
      "skill:read": "Lire les informations du skill"
    }
  }
}
```

### OutputDefinition

```json
{
  "content_type": "application/json",
  "schema": {
    "type": "object",
    "properties": {
      "translated_text": { "type": "string" },
      "source_language": { "type": "string" },
      "target_language": { "type": "string" }
    }
  },
  "description": "Résultat de traduction incluant le texte traduit et les informations de langue"
}
```

## 4.5 Exemple Complet

Voici un exemple complet de Descriptor pour un skill de traduction :

```json
{
  "protocol": {
    "version": "1.0.0",
    "changelog_url": "https://skill-sharing.org/changelog"
  },
  "id": "com.example.translate-v1",
  "name": "Universal Translator",
  "version": "2.1.0",
  "capability_type": "api",
  "description": "Service de traduction de texte de haute qualité supportant 100+ langues",
  "provider": {
    "name": "Example Corp",
    "url": "https://example.com",
    "contact": "skills@example.com"
  },
  "endpoint": {
    "url": "https://api.example.com/skills/translate/invoke",
    "method": "POST",
    "content_type": "application/json",
    "status_url": "https://api.example.com/skills/translate/status/{execution_id}",
    "result_url": "https://api.example.com/skills/translate/result/{execution_id}",
    "timeout_ms": 30000,
    "retry": {
      "max_attempts": 3,
      "backoff_ms": 1000
    }
  },
  "inputs": [
    {
      "name": "text",
      "type": "string",
      "description": "Texte à traduire",
      "required": true,
      "schema": { "minLength": 1, "maxLength": 10000 }
    },
    {
      "name": "target_language",
      "type": "string",
      "description": "Code de la langue cible (ISO 639-1)",
      "required": true
    },
    {
      "name": "source_language",
      "type": "string",
      "description": "Code de la langue source (laisser vide pour détection automatique)",
      "required": false,
      "default": "auto"
    }
  ],
  "output": {
    "content_type": "application/json",
    "schema": {
      "type": "object",
      "properties": {
        "translated_text": { "type": "string" },
        "source_language": { "type": "string" },
        "target_language": { "type": "string" },
        "confidence": { "type": "number" }
      }
    },
    "description": "Résultat de traduction"
  },
  "auth": {
    "type": "api_key",
    "description": "Transmettre la clé via le header X-API-Key",
    "header": "X-API-Key"
  },
  "access": "restricted",
  "tags": ["translation", "nlp", "multilingual"],
  "documentation_url": "https://docs.example.com/skills/translate",
  "created_at": "2025-01-15T08:00:00Z",
  "updated_at": "2025-03-20T14:30:00Z"
}
```
