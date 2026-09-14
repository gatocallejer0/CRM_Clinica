# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personal de una clínica de ginecología y obstetricia: Admin (dueña/gerencia
de la clínica), Doctor(a), Recepción, y cualquier rol adicional que Admin
cree desde "Roles y permisos" (ej. "Enfermera"). Uso principal desde
escritorio durante el horario de atención (recepción registrando pacientes y
cobros, doctor/a consultando o actualizando expedientes); ocasionalmente
alguien revisa la agenda o el expediente de un paciente desde tablet o
celular fuera del mostrador.

## Product Purpose

CRM interno para correr el día a día de una clínica: registro y expediente
de pacientes, agenda de citas, cobros y catálogo de servicios/productos,
reportes, y administración de personal — todo con permisos configurables
por rol, tanto a nivel de qué pantallas ve cada quien como de qué puede
hacer y qué datos puede tocar dentro de ellas.

## Positioning

Nace como software a medida para la clínica de la Dra. Gabriela Vásquez
(Guatemala), pero el usuario quiere dejar abierta la puerta a ofrecerlo a
otras clínicas más adelante. Por eso el sistema de permisos ya está
construido de forma genérica desde el inicio: los roles no están
hardcodeados a "Doctor"/"Recepción" — Admin puede crear roles arbitrarios y
elegir exactamente qué pantallas y acciones tiene cada uno (catálogo
`role_screens` + `has_screen()` en RLS + `requireScreen()` en cada Server
Action). Esa configurabilidad — y no solo la lista de módulos — es lo que
distingue este CRM de una solución rígida armada solo para esta clínica.

## Operating Context

Guatemala; una sola sede hoy. Personal mínimo: al menos una doctora
(actualmente la dueña de la práctica) y recepción. Interfaz 100% en
español. El horario/zona clínica está resuelto por helpers dedicados
(`lib/clinic-time.ts`) — la agenda asume esa zona horaria. La Agenda puede
sincronizarse con el Google Calendar personal de cada usuario (pantalla "Mi
cuenta"). No hay registro público: el primer usuario Admin se crea a mano en
Supabase y desde ahí da de alta al resto del personal.

## Capabilities and Constraints

Módulos actuales: Dashboard (KPIs + agenda del día + pacientes en riesgo),
Agenda (citas, con integración opcional a Google Calendar), Pacientes
(expediente clínico, documentos clínicos, formulario de registro
configurable), Cobros y pagos (ventas, catálogo de servicios/productos),
Reportes, Admin Center (usuarios, roles y permisos, formulario de registro,
catálogo/inventario, carga masiva de pacientes por CSV, auditoría).

Modelo de permisos de dos capas, ambas gateadas por el mismo catálogo de
pantallas: (1) Server Actions (`requireScreen("...")` en cada
`app/actions/*.ts`), (2) políticas RLS en Postgres (`has_screen(...)`). El
rol Admin es un bypass hardcodeado en ambas capas — nunca pasa por
`role_screens` — para que no pueda auto-bloquearse el acceso.

## Brand Commitments

Nombre del producto: "CRM Clínica". Marca de la clínica: "Dra. Gabriela
Vásquez, Ginecóloga y Obstetra". Paleta de marca confirmada como definitiva
(guía MAR branding & design): rosa `#E56880`, blush `#EFD8DC`, malva
`#C4979A`, gris-azulado `#C3C7D2` — ya codificada en OKLCH como tokens en
`app/globals.css`. Logo actual en `public/logo.png`.

## Evidence on Hand

`public/logo.png` — logo de la clínica. Es una herramienta interna, no hay
testimonios, casos de estudio ni prensa que aplicar.

## Product Principles

1. **El flujo real de la clínica manda.** Cada módulo espeja un proceso que
   ya existía en papel o manualmente (ficha de ingreso, libro de citas,
   registro de cobros), no una lista genérica de funciones de CRM.
2. **Un permiso nunca debe ser una trampa.** Si un rol puede ver una
   pantalla, tiene que poder usarla de verdad — datos y acciones — y el
   acceso de Admin nunca puede quedar bloqueado por configuración.
3. **A medida hoy, reusable mañana.** Se asume que hoy solo existe esta
   clínica, pero roles, pantallas y permisos son datos, no nombres
   hardcodeados, para poder incorporar una segunda clínica sin reescribir el
   sistema.
4. **Escritorio primero, móvil como conveniencia.** Los layouts deben
   degradar bien a tablet/celular para consultas puntuales, no diseñarse
   mobile-first.
5. **Español y Guatemala, sin abstracción de idioma todavía.** Copys,
   fechas y moneda asumen ese locale; no hace falta i18n mientras exista una
   sola clínica.

## Accessibility & Inclusion

No se ha establecido ningún requerimiento específico más allá de buenas
prácticas estándar de accesibilidad web.
