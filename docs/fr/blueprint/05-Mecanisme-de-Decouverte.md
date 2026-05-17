# Chapitre 5 : Mécanisme de Découverte

## 5.1 Aperçu

Le Discovery Mechanism définit comment les consommateurs de skills localisent et récupèrent les Skill Descriptors dans un réseau décentralisé. Le protocole fournit trois chemins de découverte complémentaires pour assurer flexibilité et extensibilité.

## 5.2 Découverte par Well-Known URI

### Spécification du Chemin

Les fournisseurs de skills exposent un chemin standardisé sous leur domaine :

```
GET https://{domain}/.well-known/skill-sharing
```

### Format de Réponse : Index de Skills

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
      "id": "com.example.translate-v1",
      "name": "Universal Translator",
      "capability_type": "api",
      "description": "Service de traduction de texte de haute qualité supportant 100+ langues",
      "descriptor_url": "https://example.com/skills/translate/descriptor.json",
      "access": "restricted",
      "version": "2.1.0"
    },
    {
      "id": "com.example.sentiment-v1",
      "name": "Sentiment Analyzer",
      "capability_type": "api",
      "description": "Service d'analyse de sentiment textuel",
      "descriptor_url": "https://example.com/skills/sentiment/descriptor.json",
      "access": "public",
      "version": "1.0.0"
    }
  ]
}
```

### Champs de l'Index de Skills

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `protocol` | ProtocolVersion | Oui | Version du protocole |
| `provider` | object | Oui | Information du fournisseur |
| `provider.name` | string | Oui | Nom du fournisseur |
| `provider.url` | string | Non | Site web du fournisseur |
| `skills` | SkillIndexEntry[] | Oui | Liste des skills |

### Champs des Entrées de l'Index

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | string | Oui | Identifiant unique du skill |
| `name` | string | Oui | Nom du skill |
| `capability_type` | CapabilityType | Oui | Type de capacité |
| `description` | string | Oui | Description brève |
| `descriptor_url` | string | Oui | URL complète du Descriptor |
| `access` | AccessPolicy | Oui | Politique de contrôle d'accès |
| `version` | string | Oui | Version du skill |

## 5.3 Découverte par URL Directe

Quand un consommateur connaît déjà l'URL complète d'un Skill Descriptor, il peut le récupérer directement :

```
GET https://example.com/skills/translate/descriptor.json
```

La réponse est un document JSON Skill Descriptor complet.

## 5.4 Découverte par Registre (Optionnel)

Un Skill Registry est un service d'index optionnel utilisé pour accélérer la découverte de skills inter-domaines. Le registre n'est pas une condition préalable au fonctionnement du protocole.

### Interface de Requête

```
GET {registry_url}/skills?type={capability_type}
```

### Format de Réponse

Retourne une liste de références de Skill Descriptors correspondants dans le même format que les entrées de l'index de skills.

## 5.5 Contrôle d'Accès et Découverte

Le mécanisme de découverte est étroitement lié aux politiques de contrôle d'accès :

| Politique d'Accès | Découverte non authentifiée | Découverte authentifiée | Invocation |
|-------------------|----------------------------|------------------------|------------|
| `public` | ✓ Visible | ✓ Visible | Pas d'authentification requise |
| `restricted` | ✓ Visible | ✓ Visible | Authentification requise |
| `private` | ✗ Non visible | ✓ Visible | Authentification requise |

Règles clés :
- Quand une requête non authentifiée accède à la Well-Known URI, l'index de skills retourné **n'inclut pas** les skills avec `access` défini à `private`
- Les requêtes authentifiées peuvent voir tous les skills (y compris les privés)

## 5.6 Filtrage par Type de Capacité

Les consommateurs peuvent filtrer les skills par type de capacité :

```
GET /.well-known/skill-sharing?type=api
```

Règles de filtrage :
- Chaque skill dans l'ensemble de résultats a un `capability_type` égal à la valeur du filtre
- Tous les skills correspondant à ce type dans l'ensemble original apparaissent dans les résultats
- Le filtrage n'affecte pas les règles de contrôle d'accès (les skills privés restent invisibles pour les requêtes non authentifiées)

## 5.7 Unicité de l'Identifiant de Skill

Dans le même index de skills, tous les skills doivent avoir des valeurs de champ `id` uniques. Le format d'ID recommandé est :

```
{reverse_domain}.{skill_name}-v{major_version}
```

Exemples :
- `com.example.translate-v1`
- `org.openai.gpt4-v1`
- `io.github.user.code-review-v2`
