# Chapter 12: Correctness Guarantees

## 12.1 Overview

The protocol defines system invariants through formalized Correctness Properties. These properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees, validated through Property-Based Testing.

## 12.2 Correctness Properties List

### Property 1: Skill Descriptor Structural Integrity

For any valid SkillDescriptor object, it must contain all required fields: `protocol` (with `version`), `id`, `name`, `version`, `capability_type`, `description`, `provider`, `endpoint`, `inputs`, `output`, `auth`, `access`. Any object missing a required field should not pass validation.

### Property 2: Enum Field Value Domain Constraints

For any valid SkillDescriptor object:
- `capability_type` must be one of `["plugin", "api", "knowledge", "task"]`
- `access` must be one of `["public", "restricted", "private"]`
- `auth.type` must be one of `["api_key", "oauth2", "custom", "none"]`

### Property 3: Serialization/Parsing Round-Trip Consistency

For any valid SkillDescriptor object, serializing it to a JSON document and then parsing it back to an object should yield a result semantically equivalent to the original:

```
parse(serialize(descriptor)) == descriptor
```

### Property 4: Schema Validation Correctness

- For any JSON document conforming to the Schema, the Schema Validator should successfully parse it and return a structured object
- For any JSON document not conforming to the Schema, the Schema Validator should return error information containing specific violating field names and error reasons

### Property 5: Skill Identifier Uniqueness

For any collection of Skill Descriptors in a Skill Index, all skills must have mutually distinct `id` field values.

### Property 6: Skill Index Correctness and Access Control

For any provider domain containing N skills, when an unauthenticated request accesses the Well-Known URI:
- The returned Skill Index should contain all skills whose `access` is not `"private"`
- It should not contain any skills whose `access` is `"private"`
- Each entry's `descriptor_url` in the index should point to a valid Skill Descriptor

### Property 7: Capability Type Filtering Correctness

For any skill collection and any CapabilityType filter value:
- Every skill in the filtered result set has a `capability_type` equal to the filter value
- All skills matching that type from the original collection appear in the result set

### Property 8: Invocation Message Structural Integrity

- For any valid InvocationRequest, it must contain `caller` (with `id` and `type`), `skill_id`, and `inputs` fields
- For any valid InvocationResponse, it must contain `execution_id`, `status`, `skill_id`, and `timestamps` fields

### Property 9: Protocol Version SemVer Format

For any valid ProtocolVersion object, its `version` field must conform to the `MAJOR.MINOR.PATCH` format, where MAJOR, MINOR, and PATCH are all non-negative integers.

### Property 10: Version Incompatibility Detection

For any Skill Descriptor protocol version and consumer-supported protocol version:
- When the descriptor's major version (MAJOR) is greater than the consumer's supported major version, a version incompatibility error is returned
- When the major versions are the same, processing proceeds normally

### Property 11: TypeScript and JSON Schema Semantic Consistency

- For any valid SkillDescriptor instance generated from TypeScript type definitions, that instance should pass JSON Schema validation
- For any JSON document passing JSON Schema validation, it should be accepted by the TypeScript type system

## 12.3 Testing Strategy

### Dual-Track Testing Method

| Method | Purpose | Tool |
|--------|---------|------|
| Unit Testing | Verify specific examples, edge cases, and error conditions | vitest |
| Property Testing | Verify universal properties across all inputs | fast-check |

### Property-Based Testing Configuration

- Each property test runs a minimum of 100 iterations
- Uses the fast-check library to generate random test data
- Each correctness property is implemented by a single property test
- Test label format: `Feature: skill-sharing-protocol, Property {N}: {description}`

### Test Example

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
