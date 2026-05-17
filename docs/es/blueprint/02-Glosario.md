# Capítulo 2: Glosario

## 2.1 Términos Fundamentales

| Término | Inglés | Definición |
|---------|--------|------------|
| iFay | iFay | Sistema de compañero cognitivo inteligente. Principal consumidor del Skill Sharing Protocol, que descubre e invoca skills para mejorar sus propias capacidades |
| Skill | Skill | Unidad de capacidad invocable declarada conforme al protocolo. Incluye plugins, APIs, paquetes de conocimiento y capacidades de ejecución de tareas, entre otros |
| Proveedor de skills | Skill Provider | Entidad (persona, organización o sistema automatizado) que declara y expone skills en Internet |
| Consumidor de skills | Skill Consumer | Entidad que descubre e invoca skills. Principalmente instancias de iFay |
| Descriptor de skill | Skill Descriptor | Documento de metadatos de skill definido según el Schema del protocolo, que describe capacidades, interfaces, métodos de invocación, etc. |

## 2.2 Términos del Protocolo

| Término | Inglés | Definición |
|---------|--------|------------|
| Mecanismo de descubrimiento | Discovery Mechanism | Métodos y procesos mediante los cuales los consumidores de skills localizan y descubren Skill Descriptors en redes descentralizadas |
| Schema del protocolo | Protocol Schema | Especificación formalizada que define la estructura de los Skill Descriptors. Incluye JSON Schema, tipos TypeScript y documentación MDX |
| Registro de skills | Skill Registry | Servicio de índice de skills opcional para acelerar el descubrimiento de skills, pero no es un prerrequisito para la operación del protocolo |
| Punto de invocación | Invocation Endpoint | Dirección del punto de entrada para llamadas remotas declarada en el Skill Descriptor |
| Tipo de capacidad | Capability Type | Identificador de clasificación de un skill. Incluye plugin, api, knowledge, task |
| Schema Validator | Schema Validator | Herramienta o componente para validar la conformidad de los Skill Descriptors con el Schema del protocolo |
| Versión del protocolo | Protocol Version | Identificador de versión de la especificación del protocolo. Sigue Semantic Versioning |

## 2.3 Términos Técnicos

| Término | Inglés | Definición |
|---------|--------|------------|
| Well-Known URI | Well-Known URI | Ruta de descubrimiento estandarizada `/.well-known/skill-sharing`. Usada para exponer el índice de skills bajo un dominio |
| Índice de skills | Skill Index | Documento retornado por la Well-Known URI. Contiene una lista de referencias de todos los Skill Descriptors declarados bajo el dominio |
| Versionado semántico | Semantic Versioning (SemVer) | Formato de número de versión `MAJOR.MINOR.PATCH`. Usado para la gestión de versiones del protocolo |
| JSON Schema | JSON Schema | Estándar para describir estructuras de datos JSON. Este protocolo usa Draft 2020-12 |
| Política de acceso | Access Policy | Nivel de visibilidad de un skill: público (public), restringido (restricted), privado (private) |
| ID de ejecución | Execution ID | Identificador único retornado después de invocar un skill. Usado para rastrear el estado de ejecución y obtener resultados |
