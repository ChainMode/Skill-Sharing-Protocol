# Capítulo 11: Soporte Multilingüe

## 11.1 Descripción General

El protocolo se dirige a la comunidad global de desarrolladores, proporcionando documentación del protocolo en 9 idiomas para asegurar que desarrolladores de diferentes orígenes lingüísticos puedan comprender con precisión la especificación del protocolo.

## 11.2 Idiomas Soportados

| Código de Idioma | Idioma | Ruta del Directorio | Rol |
|-----------------|--------|--------------------|----|
| `en` | English | `docs/en/` | Idioma base |
| `zh-CN` | Chino simplificado | `docs/zh-CN/` | Traducción |
| `zh-TW` | Chino tradicional | `docs/zh-TW/` | Traducción |
| `ja` | Japonés | `docs/ja/` | Traducción |
| `ko` | Coreano | `docs/ko/` | Traducción |
| `de` | Alemán | `docs/de/` | Traducción |
| `fr` | Francés | `docs/fr/` | Traducción |
| `es` | Español | `docs/es/` | Traducción |
| `ru` | Ruso | `docs/ru/` | Traducción |

## 11.3 Estructura de Directorios

Cada idioma mantiene una estructura de directorios independiente:

```
docs/{language_code}/
├── specification/
│   ├── draft/                # Documento de especificación borrador
│   │   └── specification.md
│   └── 2025-10-25/          # Documento de especificación versionado
│       └── specification.md
├── blueprint/               # Documentación blueprint
│   └── illustration/        # Recursos de ilustración
├── community/               # Documentación comunitaria
├── develop/                 # Guías de desarrollo
└── sdk/                     # Documentación SDK
```

## 11.4 Estrategia de Idioma Base

- El inglés (en) sirve como idioma base para la documentación del protocolo
- Todo nuevo contenido se escribe primero en inglés
- Otras versiones de idioma se traducen del inglés
- Cuando los documentos del idioma base se actualizan, el estado de sincronización se anota en otras versiones

## 11.5 Principios de Traducción

1. Los términos técnicos se mantienen en inglés (ej. Skill Descriptor, Well-Known URI)
2. Las descripciones conceptuales se expresan en el idioma destino
3. Los comentarios en ejemplos de código se traducen al idioma destino
4. La estructura del documento se mantiene consistente con el idioma base
5. Cada versión traducida anota el número de versión correspondiente del idioma base

## 11.6 Anotación de Estado de Sincronización

```markdown
---
base_version: en/2025-10-25
sync_status: synced | outdated | in_progress
last_synced: 2025-10-25
---
```
