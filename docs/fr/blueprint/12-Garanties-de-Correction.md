# Chapitre 12 : Garanties de Correction

## 12.1 Aperçu

Le protocole définit des invariants système à travers des Correctness Properties (propriétés de correction) formalisées. Ces propriétés servent de pont entre les spécifications lisibles par l'humain et les garanties de correction vérifiables par machine, validées par le Property-Based Testing.

## 12.2 Liste des Propriétés de Correction

### Propriété 1 : Intégrité Structurelle du Skill Descriptor

Pour tout objet SkillDescriptor valide, il doit contenir tous les champs obligatoires : `protocol` (avec `version`), `id`, `name`, `version`, `capability_type`, `description`, `provider`, `endpoint`, `inputs`, `output`, `auth`, `access`. Tout objet manquant un champ obligatoire ne devrait pas passer la validation.

### Propriété 2 : Contraintes de Domaine de Valeurs des Champs Énumérés

Pour tout objet SkillDescriptor valide :
- `capability_type` doit être l'un de `["plugin", "api", "knowledge", "task"]`
- `access` doit être l'un de `["public", "restricted", "private"]`
- `auth.type` doit être l'un de `["api_key", "oauth2", "custom", "none"]`

### Propriété 3 : Cohérence Aller-Retour Sérialisation/Parsing

Pour tout objet SkillDescriptor valide, le sérialiser en document JSON puis le parser de nouveau en objet devrait produire un résultat sémantiquement équivalent à l'original :

```
parse(serialize(descriptor)) == descriptor
```

### Propriété 4 : Correction de la Validation Schema

- Pour tout document JSON conforme au Schema, le Schema Validator devrait le parser avec succès et retourner un objet structuré
- Pour tout document JSON non conforme au Schema, le Schema Validator devrait retourner des informations d'erreur contenant les noms de champs en violation et les raisons d'erreur

### Propriété 5 : Unicité de l'Identifiant de Skill

Pour toute collection de Skill Descriptors dans un Skill Index, tous les skills doivent avoir des valeurs de champ `id` mutuellement distinctes.

### Propriété 6 : Correction de l'Index de Skills et Contrôle d'Accès

Pour tout domaine fournisseur contenant N skills, quand une requête non authentifiée accède à la Well-Known URI :
- L'index de skills retourné devrait contenir tous les skills dont `access` n'est pas `"private"`
- Il ne devrait contenir aucun skill dont `access` est `"private"`
- Le `descriptor_url` de chaque entrée dans l'index devrait pointer vers un Skill Descriptor valide

### Propriété 7 : Correction du Filtrage par Type de Capacité

Pour toute collection de skills et toute valeur de filtre CapabilityType :
- Chaque skill dans l'ensemble de résultats filtré a un `capability_type` égal à la valeur du filtre
- Tous les skills correspondant à ce type dans la collection originale apparaissent dans l'ensemble de résultats

### Propriété 8 : Intégrité Structurelle du Message d'Invocation

- Pour toute InvocationRequest valide, elle doit contenir les champs `caller` (avec `id` et `type`), `skill_id` et `inputs`
- Pour toute InvocationResponse valide, elle doit contenir les champs `execution_id`, `status`, `skill_id` et `timestamps`

### Propriété 9 : Format SemVer de la Version du Protocole

Pour tout objet ProtocolVersion valide, son champ `version` doit être conforme au format `MAJOR.MINOR.PATCH`, où MAJOR, MINOR et PATCH sont tous des entiers non négatifs.

### Propriété 10 : Détection d'Incompatibilité de Version

Pour toute version de protocole de Skill Descriptor et version de protocole supportée par le consommateur :
- Quand la version majeure (MAJOR) du Descriptor est supérieure à la version majeure supportée par le consommateur, une erreur d'incompatibilité de version est retournée
- Quand les versions majeures sont identiques, le traitement se poursuit normalement

### Propriété 11 : Cohérence Sémantique TypeScript et JSON Schema

- Pour toute instance SkillDescriptor valide générée à partir de définitions de types TypeScript, cette instance devrait passer la validation JSON Schema
- Pour tout document JSON passant la validation JSON Schema, il devrait être accepté par le système de types TypeScript

## 12.3 Stratégie de Test

### Méthode de Test Double Voie

| Méthode | Objectif | Outil |
|---------|----------|-------|
| Tests unitaires | Vérifier des exemples spécifiques, cas limites et conditions d'erreur | vitest |
| Tests de propriétés | Vérifier des propriétés universelles sur toutes les entrées | fast-check |

### Configuration du Property-Based Testing

- Chaque test de propriété exécute un minimum de 100 itérations
- Utilise la bibliothèque fast-check pour générer des données de test aléatoires
- Chaque propriété de correction est implémentée par un seul test de propriété
- Format de label de test : `Feature: skill-sharing-protocol, Property {N}: {description}`

### Exemple de Test

```typescript
import fc from 'fast-check';

fc.assert(
  fc.property(
    skillDescriptorArbitrary,
    (descriptor) => {
      // Feature: skill-sharing-protocol, Property 3: round-trip consistency
      const serialized = serialize(descriptor);
      const parsed = parse(serialized);
      expect(parsed).toEqual(descriptor);
    }
  ),
  { numRuns: 100 }
);
```
