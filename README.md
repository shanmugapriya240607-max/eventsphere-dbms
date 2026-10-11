# EventSphere DBMS

EventSphere is a Next.js college event planning and participant management system backed by MySQL 8 and Drizzle ORM.

## Features
- User Registration
- User Login
- Event Listing
- Event Registration
- View Registered Events
- Admin Event Management

## Phase 1 local setup

1. Install and start MySQL 8.
2. Create a MySQL user with permission to create the `eventsphere_db` database.
3. Copy `.env.template` to `.env.local` and replace the placeholder password and auth secret.
4. Run `npm install`.
5. Run `npm run db:init` to create the schema, view, trigger, indexes, and seed records.
6. Run `npm run dev`, then request `GET http://localhost:3000/api/events`.

Demo seed accounts use password `EventSphere@2026`:

- Admin: `admin@eventsphere.edu`
- Student: `student@eventsphere.edu`

Do not use demo credentials in production.

## Database artifacts

- `database/schema.sql` contains MySQL 8 DDL, relationships, constraints, indexes, the reporting view, and venue-overlap trigger.
- `database/seed.sql` contains repeatable sample data.
- `database/sample-queries.sql` demonstrates joins, a subquery, view usage, locking, and a transaction.
- `database/ER_DIAGRAM.md` contains the Mermaid ER model.

## Project Timeline
Based on the implementation schedule provided by the college.

## Verification

Run `npm run lint`, `npm run typecheck`, and `npm run build`. A live MySQL verification additionally requires valid local credentials in `.env.local`.
