@AGENTS.md

# Starter de plomería (design-agnóstico)

Este repo es el MOTOR, no la pintura. Trae la plomería que se repite en todo proyecto;
el diseño es bespoke por cliente (no hay sistema de diseño aquí, shadcn neutro a propósito).

## Reglas (heredan del CLAUDE.md global de Oscar)
- Seguridad de base: toda server action / route handler abre con `requireUser()`/`requireRole()`.
  Validar todo input con Zod (`src/lib/validate.ts`). Nunca confiar en IDs del cliente: cargarlos de DB.
- Estados por default: cada vista nace con loading / empty / error (`src/components/states.tsx`).
- Persistir estado del usuario; nada efímero que se pierda al recargar.
- Secrets solo en `.env.local`. Headers de seguridad ya van en `next.config.ts`.
- Endpoints caros / de IA: proteger con Vercel BotID (ver `src/app/api/expensive`).
- Git: commits chicos por feature, push frecuente; no saltar de tarea sin commitear.

## Diseño (bespoke por proyecto)
- El starter NO trae estética. Al iniciar la UI, llena `DESIGN.md` desde el reference lock de Refero
  y el agente lo lee para ser consistente. No copies DESIGN.md de marcas ajenas tal cual.

## Qué hay
- Auth por cookie firmada (PBKDF2 + HMAC) en `src/lib/auth.ts` + `src/lib/session.ts`
  (`requireUser`/`requireRole`/`requireAdmin`/`requireLeadAccess`). Roles: admin/agent/viewer.
- DB: Drizzle + Neon (`src/lib/db.ts`, `src/lib/schema.ts`), migraciones drizzle-kit, seed.
- Blob (`src/lib/blob.ts`), Resend (`src/lib/email.ts`), env validado (`src/lib/env.ts`).
- Sentry guardado por DSN, CI (tsc+lint+build), Playwright smoke con screenshot.
- Tabla `items` + `/admin/items`: plantilla del patrón CRUD (capa de dominio). Renómbrala o bórrala.

## CRM (módulo en `/admin`)
- Leads (pipeline, board, detalle, comentarios, eventos/audit, archivos, asignación), usuarios multi-rol,
  dashboard de métricas y blog bilingüe opcional. Captura pública en `POST /api/leads`. Guard de borde en
  `src/proxy.ts`. Libs en `src/lib/crm-*.ts` y `src/lib/blog/`; UI en `src/components/crm/`.
- Tema del panel bajo `.crm-root` (dark+mint), re-marcable por `--crm-accent` en `globals.css`. No se
  filtra al sitio público.
- IA opcional (`ANTHROPIC_API_KEY`): draft de blog + resumen de leads de bot. Voz del blog en
  `src/lib/blog/voice.ts` (personalizar por cliente, no dejar genérica).
- Tier Landing sin CRM: borrar `src/app/admin`, `src/app/api/leads`, `src/proxy.ts`, las tablas CRM del
  schema y las libs `crm-*`/`blog`.
