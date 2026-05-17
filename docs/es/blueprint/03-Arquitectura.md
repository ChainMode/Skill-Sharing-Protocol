# Capítulo 3: Arquitectura

## 3.1 Arquitectura General

El protocolo adopta una arquitectura Provider-Consumer descentralizada, similar al modelo de descubrimiento por hipervínculos de la Web y al mecanismo de descubrimiento de nodos de redes P2P.

```
┌─────────────────────────────────────────────────────────┐
│              Dominio del Proveedor (Provider Domain)      │
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
│              Consumidor de Skills (iFay)                  │
│                                                         │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐      │
│  │Discovery   │→ │Schema        │→ │Invocation  │      │
│  │Client      │  │Validator     │  │Client      │      │
│  └────────────┘  └──────────────┘  └────────────┘      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│         Opcional: Registro de Skills (Skill Registry)    │
│                                                         │
│  ┌────────────────────────────────────┐                 │
│  │          Registry Index            │                 │
│  │  (Referencias de índice → Descriptores de proveedores)│
│  └────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

## 3.2 Flujo de Interacción del Protocolo

### Fase 1: Descubrimiento de Skills

```
Consumidor (iFay)                    Proveedor
      │                                  │
      │── GET /.well-known/skill-sharing ─→│
      │                                  │
      │←── Índice de Skills (Skill Index) ─│
      │                                  │
      │── Schema Validator parsing ──→    │
      │                                  │
```

### Fase 2: Invocación de Skills

```
Consumidor (iFay)                    Proveedor
      │                                  │
      │── POST {invocation_endpoint} ────→│
      │   (Solicitud de invocación)       │
      │                                  │
      │←── 202 Accepted ─────────────────│
      │   (Confirmación + ID de ejecución)│
      │                                  │
      │── GET {status_endpoint}/{id} ────→│
      │                                  │
      │←── Estado de ejecución ──────────│
      │                                  │
      │── GET {result_endpoint}/{id} ────→│
      │                                  │
      │←── Resultado de ejecución ───────│
      │                                  │
```

## 3.3 Tres Rutas de Descubrimiento

| Ruta | Método | Descripción | Caso de Uso |
|------|--------|-------------|-------------|
| Well-Known URI | `GET /.well-known/skill-sharing` | Método principal de descubrimiento. Retorna el índice de todos los skills bajo el dominio | Explorar todos los skills de un proveedor |
| URL directa | `GET {skill_descriptor_url}` | Obtención directa cuando la URL del Skill Descriptor es conocida | Dirección de skill específica conocida |
| Consulta al registro | `GET {registry_url}/skills?type={type}` | Opcional. Búsqueda masiva a través del registro | Búsqueda de skills por tipo |

## 3.4 Arquitectura de Organización de Archivos

```
project-root/
├── docs/
│   ├── en/                          # Idioma base (inglés)
│   │   ├── specification/
│   │   │   ├── 2025-11-25/          # Documentos versionados
│   │   │   └── draft/               # Documentos borrador
│   │   ├── blueprint/               # Documentos blueprint
│   │   ├── community/               # Documentos comunitarios
│   │   ├── develop/                 # Guías de desarrollo
│   │   └── sdk/                     # Documentos SDK
│   └── ...                          # Otros idiomas (misma estructura)
├── schema/
│   ├── draft/                       # Schema borrador
│   │   ├── schema.json
│   │   ├── schema.ts
│   │   └── schema.mdx
│   └── 2025-10-25/                  # Schema versionado
│       ├── schema.json
│       ├── schema.ts
│       └── schema.mdx
└── src/                             # Código fuente de herramientas
    ├── validator.ts                 # Schema Validator
    ├── discovery.ts                 # Lógica del mecanismo de descubrimiento
    ├── invocation.ts                # Lógica del protocolo de invocación
    └── version.ts                   # Lógica de gestión de versiones
```

## 3.5 Responsabilidades de los Componentes

### Discovery Client (Cliente de descubrimiento)

Responsable de localizar Skill Descriptors en la red descentralizada:
- Enviar solicitudes a la Well-Known URI para obtener el índice de skills
- Obtener Skill Descriptors conocidos vía URL directa
- Búsqueda masiva a través del registro
- Soporte de consultas de filtrado basadas en tipo de capacidad

### Schema Validator

Responsable de validar la conformidad de los Skill Descriptors:
- Usa schema.json para validar documentos Skill Descriptor
- Parsea documentos válidos en objetos Skill Descriptor estructurados
- Retorna campos en violación específicos y razones para documentos inválidos
- Soporta serialización de objetos Skill Descriptor a Pretty Print JSON

### Invocation Client (Cliente de invocación)

Responsable de la invocación remota de skills descubiertos:
- Construcción de solicitudes de invocación estandarizadas
- Procesamiento del flujo de autenticación
- Gestión de consultas de estado de ejecución
- Manejo de respuestas de timeout y error
