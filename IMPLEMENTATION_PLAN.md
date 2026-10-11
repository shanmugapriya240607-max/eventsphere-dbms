# EventSphere Implementation Plan

## Inspection findings

- `eventsphere` is a Next.js 16 App Router application with server actions, route handlers, cookie-based authentication, and Drizzle ORM. It already has student/admin pages, events, registrations, announcements, certificates, exports, and dashboard queries.
- The actual database implementation was PostgreSQL (`pg`, `drizzle-orm/node-postgres`, PostgreSQL DDL and query syntax), despite the old README describing MySQL.
- `constraint-reference` is an unrelated React/FastAPI/SQLite scheduling optimizer. Its useful idea is explicit validation of scheduling/resource conflicts; no code should be copied into EventSphere.
- The existing visual design and application routes are worth preserving. The runtime bootstrap that created and populated PostgreSQL tables on requests should be replaced by explicit, reproducible database scripts.

## Delivery phases

1. **MySQL foundation (current):** switch to `mysql2` and Drizzle MySQL, define the relational schema, add deterministic seed data, provide an initializer, and verify the event listing API against MySQL 8.
2. **Authentication and event administration:** validate inputs, harden sessions, and fully verify student/admin login plus event CRUD.
3. **Registration and participant workflow:** transactional registration/cancellation, capacity enforcement, participant approval, and attendance tracking.
4. **Venue scheduling:** venue administration, schedule allocation, and database-backed overlap prevention surfaced cleanly in the UI.
5. **Reports and DBMS deliverables:** analytics queries, views, exports, sample joins/subqueries/transactions, ER diagram, and printable report material.
6. **Final verification:** automated tests, lint/type/build checks, end-to-end browser checks, documentation, and deployment instructions.

## Phase 1 acceptance criteria

- No PostgreSQL runtime dependency remains.
- MySQL 8 schema and seed scripts run repeatedly without corrupting data.
- `/api/events` reads seeded events through Drizzle/MySQL and supports search/category filters.
- Type checking, linting, production build, database initialization, and a live API request are verified before commit/push.
