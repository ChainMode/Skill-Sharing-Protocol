# Chapitre 7 : Sécurité et Authentification

## 7.1 Aperçu

Les mécanismes de sécurité sont une partie essentielle du protocole, garantissant que les fournisseurs de skills peuvent contrôler qui peut découvrir et invoquer leurs skills. Le protocole supporte plusieurs méthodes d'authentification et politiques de contrôle d'accès, trouvant un équilibre entre ouverture et sécurité.

## 7.2 Politiques de Contrôle d'Accès

### Contrôle d'Accès à Trois Niveaux

| Niveau | Visibilité de découverte | Permission d'invocation | Cas d'utilisation |
|--------|-------------------------|------------------------|-------------------|
| `public` | Visible par tous | Pas d'authentification requise | APIs ouvertes, bases de connaissances publiques |
| `restricted` | Visible par tous | Authentification requise | APIs commerciales, services payants |
| `private` | Visible uniquement après authentification | Authentification requise | Outils internes, services privés |

### Relation entre Contrôle d'Accès et Découverte

- Quand une requête non authentifiée accède à la Well-Known URI :
  - Tous les skills `public` et `restricted` sont retournés
  - Les skills `private` ne sont pas retournés
- Quand une requête authentifiée accède à la Well-Known URI :
  - Tous les skills sont retournés (y compris `private`)

## 7.3 Méthodes d'Authentification

### Authentification par API Key

La méthode d'authentification la plus simple, transmettant une clé via HTTP Header.

Déclaration dans le Descriptor :
```json
{
  "type": "api_key",
  "description": "Transmettre l'API Key via HTTP Header",
  "header": "X-API-Key"
}
```

Header attaché lors de l'invocation :
```
POST /invoke HTTP/1.1
Host: api.example.com
X-API-Key: sk-your-api-key-here
Content-Type: application/json
```

### Authentification OAuth 2.0

Adaptée aux scénarios nécessitant un contrôle de permissions granulaire.

Déclaration dans le Descriptor :
```json
{
  "type": "oauth2",
  "oauth2": {
    "authorization_url": "https://example.com/oauth/authorize",
    "token_url": "https://example.com/oauth/token",
    "scopes": {
      "skill:invoke": "Invoquer le skill",
      "skill:read": "Lire les informations du skill",
      "skill:admin": "Gérer la configuration du skill"
    }
  }
}
```

Bearer Token attaché lors de l'invocation :
```
POST /invoke HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json
```

### Authentification Personnalisée

Adaptée aux scénarios d'authentification non standard ; les fournisseurs expliquent la méthode via le champ `instructions`.

Déclaration dans le Descriptor :
```json
{
  "type": "custom",
  "custom": {
    "instructions": "Signer le corps de la requête avec HMAC-SHA256 et placer la signature dans le header X-Signature",
    "parameters": [
      {
        "name": "secret_key",
        "type": "string",
        "description": "Clé secrète pour la signature HMAC",
        "required": true
      }
    ]
  }
}
```

### Sans Authentification

Les skills publics ne nécessitent pas d'authentification :
```json
{
  "type": "none"
}
```

## 7.4 Gestion des Erreurs d'Authentification

### Échec d'Authentification (401)

Quand des credentials valides ne sont pas fournis :
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

### Permissions Insuffisantes (403)

Quand les credentials sont valides mais manquent de droits d'accès :
```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Insufficient permissions to invoke this skill",
    "details": {
      "required_scopes": ["skill:invoke"],
      "current_scopes": ["skill:read"]
    }
  }
}
```

## 7.5 Bonnes Pratiques de Sécurité

1. Toute communication devrait utiliser HTTPS
2. Les API Keys devraient être transmises via Headers, évitant l'exposition dans les URLs
3. Les Tokens OAuth 2.0 devraient avoir des durées d'expiration raisonnables
4. Les fournisseurs de skills devraient implémenter une limitation de débit pour prévenir les abus
5. Les skills sensibles devraient utiliser la politique d'accès `private` pour éviter la découverte par des parties non autorisées
