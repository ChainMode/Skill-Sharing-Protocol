# Capítulo 12: Garantías de Corrección

## 12.1 Descripción General

El protocolo define invariantes del sistema a través de Correctness Properties (propiedades de corrección) formalizadas. Estas propiedades sirven como puente entre especificaciones legibles por humanos y garantías de corrección verificables por máquina, validadas mediante Property-Based Testing.

## 12.2 Lista de Propiedades de Corrección

### Propiedad 1: Integridad Estructural del Skill Descriptor

Para cualquier objeto SkillDescriptor válido, debe contener todos los campos obligatorios: `protocol` (con `version`), `id`, `name`, `version`, `capability_type`, `description`, `provider`, `endpoint`, `inputs`, `output`, `auth`, `access`.

### Propiedad 2: Restricciones de Dominio de Valores de Campos Enumerados

- `capability_type` debe ser uno de `["plugin", "api", "knowledge", "task"]`
- `access` debe ser uno de `["public", "restricted", "private"]`
- `auth.type` debe ser uno de `["api_key", "oauth2", "custom", "none"]`

### Propiedad 3: Consistencia de Ida y Vuelta Serialización/Parsing

```
parse(serialize(descriptor)) == descriptor
```

### Propiedad 4: Corrección de Validación Schema

- Documentos conformes al Schema deben ser parseados exitosamente
- Documentos no conformes deben retornar errores con campos en violación específicos

### Propiedad 5: Unicidad del Identificador de Skill

Todos los skills en un Skill Index deben tener valores de `id` mutuamente distintos.

### Propiedad 6: Corrección del Índice de Skills y Control de Acceso

Para solicitudes no autenticadas a Well-Known URI: incluir todos los skills no privados, excluir todos los privados.

### Propiedad 7: Corrección del Filtrado por Tipo de Capacidad

El filtrado retorna exactamente los skills que coinciden con el tipo especificado.

### Propiedad 8: Integridad Estructural del Mensaje de Invocación

- InvocationRequest debe contener `caller` (con `id` y `type`), `skill_id`, `inputs`
- InvocationResponse debe contener `execution_id`, `status`, `skill_id`, `timestamps`

### Propiedad 9: Formato SemVer de Versión del Protocolo

El campo `version` debe conformar al formato `MAJOR.MINOR.PATCH` con enteros no negativos.

### Propiedad 10: Detección de Incompatibilidad de Versión

Cuando MAJOR del Descriptor > MAJOR soportado por consumidor → error de incompatibilidad.

### Propiedad 11: Consistencia Semántica TypeScript y JSON Schema

Instancias válidas de TypeScript deben pasar validación JSON Schema y viceversa.

## 12.3 Estrategia de Pruebas

### Método de Pruebas de Doble Vía

| Método | Propósito | Herramienta |
|--------|-----------|-------------|
| Pruebas unitarias | Verificar ejemplos específicos, casos límite y condiciones de error | vitest |
| Pruebas de propiedades | Verificar propiedades universales en todas las entradas | fast-check |

### Configuración de Property-Based Testing

- Cada prueba de propiedad ejecuta un mínimo de 100 iteraciones
- Usa la biblioteca fast-check para generar datos de prueba aleatorios
- Formato de etiqueta: `Feature: skill-sharing-protocol, Property {N}: {description}`

### Ejemplo de Prueba

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
