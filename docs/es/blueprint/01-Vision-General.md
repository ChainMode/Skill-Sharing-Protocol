# Capítulo 1: Visión General

## 1.1 Contexto del Proyecto

El Skill Sharing Protocol es un subproyecto central del ecosistema iFay. Como sistema de compañero cognitivo inteligente, iFay necesita una forma estandarizada de descubrir e invocar capacidades distribuidas por Internet — nos referimos colectivamente a estas capacidades como "skills".

Los modelos actuales de extensión de capacidades de IA dependen de plataformas centralizadas (como marketplaces de plugins y gateways de API), que introducen puntos únicos de fallo, dependencia de plataforma y cuellos de botella en la innovación. El Skill Sharing Protocol propone un nuevo paradigma descentralizado: los proveedores de skills declaran y exponen skills en Internet siguiendo las convenciones del protocolo, y iFay puede descubrir e invocar estos skills de forma autónoma.

Este concepto es análogo a:
- **El modelo de hipervínculos de la Web**: Cualquiera puede publicar contenido bajo su propio dominio, y los motores de búsqueda lo descubren automáticamente
- **Los nodos descentralizados de blockchain**: No se necesita registro centralizado; los nodos declaran y descubren de forma autónoma
- **Los mecanismos de descubrimiento de seeds P2P**: Localización de recursos en redes distribuidas

## 1.2 Filosofía Central

> Cualquier capacidad ejecutable puede convertirse en un skill invocable.

El alcance de los "skills" abarca:

| Tipo | Descripción | Ejemplos |
|------|-------------|----------|
| Plugin | Módulos funcionales integrables | Plugin de procesamiento de imágenes, plugin de análisis de texto |
| API | Interfaces de servicios remotos | API de clima, servicio de traducción |
| Knowledge | Recursos de conocimiento estructurado | Base de conocimiento de dominio, dataset de FAQ |
| Task | Tareas ejecutables por humanos o iFay | Revisión de código, traducción de documentos |

## 1.3 Principios de Diseño

1. **Descubrimiento descentralizado**: Los proveedores de skills declaran skills bajo su propio dominio; los consumidores descubren skills a través de rutas estandarizadas sin plataformas centralizadas
2. **Auto-descriptivo**: Cada skill describe completamente sus capacidades, interfaces y métodos de invocación a través de un Skill Descriptor estandarizado
3. **El protocolo como especificación**: Los entregables son documentos de protocolo y archivos de definición Schema, no aplicaciones de software
4. **Abierto e inclusivo**: Documentación del protocolo en 9 idiomas, dirigida a la comunidad global de desarrolladores

## 1.4 Entregables del Proyecto

Este es un proyecto de código abierto con los siguientes entregables:

1. **Documentos de especificación del protocolo**: 9 versiones de idioma (en, zh-CN, zh-TW, ja, ko, de, fr, es, ru)
2. **Archivos de definición Schema**:
   - JSON Schema (Draft 2020-12)
   - Definiciones de tipos TypeScript
   - Documentación interactiva MDX
3. **Schema Validator**: Una herramienta para validar la conformidad de los Skill Descriptors con el Schema del protocolo

## 1.5 Audiencia Objetivo

- **Proveedores de skills**: Quienes desean exponer sus capacidades como skills descubribles e invocables
- **Consumidores de skills (instancias iFay)**: Quienes necesitan descubrir e invocar skills externos para mejorar sus propias capacidades
- **Desarrolladores de integración de protocolo**: Quienes construyen herramientas, SDKs o plataformas basadas en el protocolo
- **Comunidad global de desarrolladores**: Quienes participan en la discusión, mejora e implementación del protocolo
