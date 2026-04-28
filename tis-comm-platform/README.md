# TIS D365 Communication Platform

Prototype web application for **Trelleborg Industrial Solutions** to manage the
D365 ERP rollout communication framework across 6 manufacturing sites.

The app provides a structured way for project teams, change managers, the PMO
and program leadership to plan, execute and govern every communication artefact
required by the framework — from weekly status reports to gate communications
and post-go-live surveys.

---

## Stack

- **Backend** — Node + Express + TypeScript, Prisma ORM with SQLite, JWT
  authentication via httpOnly cookie, daily cron job to mark overdue comms
- **Frontend** — Vite + React 18 + TypeScript + Tailwind CSS, React Router,
  TanStack Query for server state, Recharts for charts, Lucide icons
- **Templates** — 29 communication templates baked into the server as
  `data/templates.json`

## Project layout

```
tis-comm-platform/
├── client/      React + Vite frontend
├── server/      Express + Prisma backend
└── package.json npm workspaces root
```

## Install & run

```bash
cd tis-comm-platform
npm install
npm --workspace=server exec prisma migrate dev   # creates SQLite DB
npm run db:seed                                  # loads demo data
npm run dev                                      # client + server in parallel
```

- Server: http://localhost:3001
- Client: http://localhost:5173

To rebuild from scratch: `rm server/dev.db && npm --workspace=server exec prisma migrate dev && npm run db:seed`.

## Test credentials

| Email                  | Password      | Role               | Visible sites |
| ---------------------- | ------------- | ------------------ | -------------- |
| admin@tis.com          | Admin2024!    | ADMIN              | All            |
| damien@tis.com         | Damien2024!   | PROGRAM_MANAGER    | All            |
| massimo@tis.com        | Massimo2024!  | PMO                | All            |
| pm.varnamoo@tis.com    | PMVrn2024!    | PROJECT_MANAGER    | VRN            |
| pm.taurage@tis.com     | PMTau2024!    | PROJECT_MANAGER    | TAU            |
| cm.varnamoo@tis.com    | CMVrn2024!    | CHANGE_MANAGER     | VRN            |
| sa@tis.com             | SA2024!       | SOLUTION_ARCHITECT | VRN, TAU       |

## Pages

- **/login** — sign-in page with demo account hints.
- **/dashboard** (Program / PMO / Admin) — portfolio dashboard: site RAG table,
  overdue comm panel, go-live timeline.
- **/sites/:code** — site detail with eight tabs: Overview, Calendar, Weekly
  Report, Risks, Stakeholders, Milestones, Escalations, KPIs.
- **/templates** — 29-template catalogue, expandable cards with mandatory /
  forbidden sections, "due this week" helper.
- **/admin/users** (ADMIN) — user list, add / edit / activate, multi-site
  assignments.
- **/admin/sites** (ADMIN + PROGRAM_MANAGER) — site CRUD; new sites get a
  default workstream + milestone set.
- **/survey/:id/respond** — public 5-question survey form (no auth required).

## Notable backend behaviours

- All site-scoped routes enforce the `userCanAccessSite` rule. Program-level
  roles see everything, project-level roles see only their `SiteUser`
  assignments.
- A daily cron (`0 7 * * *`) marks any `CommunicationEvent` with a past `dueDate`
  and a non-final status as `OVERDUE`.
- Marking a milestone complete auto-creates a gate `CommunicationEvent` set
  to `DUE`.
- KPI entries are upserted per `(siteId, quarter)` so inline edits in the
  KPI tracker update the same row.

## Notes & limitations

- SQLite was chosen for zero-setup local demos. Prisma is configured with
  `provider = "sqlite"`, which does not support enums — every status field is
  a `String` constrained at the application layer (TypeScript types live in
  `client/src/types/index.ts`).
- The cron task only runs on the live server process. For a stricter
  guarantee you'd run the same query inside `/program/overdue` on each request.
- For production: switch the Prisma provider to PostgreSQL, set a real
  `JWT_SECRET`, enable HTTPS and adjust the cookie `secure` flag.
