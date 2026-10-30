# Seatbook

Seat booking for small venues. Organizers publish an event with a seat grid, attendees pick a seat and book it.

## Stack

- **server/**: Node, Express, TypeScript, Prisma, Postgres
- **client/**: React, Vite, TypeScript, Tailwind

## Run it

```bash
docker compose up --build
```

- App: http://localhost:5173
- API: http://localhost:4000
- Postgres: `localhost:5433` (user / password / db: `seatbook`)

The database is migrated and seeded on first start. To start from a clean database: `docker compose down -v`.

**After changing `schema.prisma`:** create the migration from your machine (`cd server && npx prisma migrate dev`, with `DATABASE_URL` pointing at `localhost:5433`), then `docker compose restart server`. The server regenerates the Prisma client and applies migrations on start.

### Seeded accounts

All passwords are `password123`.

| Email | Role |
|---|---|
| organizer@seatbook.test | Organizer |
| alice@seatbook.test | Attendee |
| bob@seatbook.test | Attendee |

### Without Docker

```bash
cd server && cp .env.example .env && npm install && npm run db:migrate && npm run db:seed && npm run dev
cd client && npm install && npm run dev
```

You need a Postgres running at the `DATABASE_URL` in `server/.env`.

However, to use the existing Docker service for Postgres, run

```bash
docker compose up -d db
```

## Scripts

| | server | client |
|---|---|---|
| `npm run dev` | API with reload | Vite dev server |
| `npm run typecheck` | `tsc --noEmit` | `tsc --noEmit` |
| `npm test` | Vitest | none yet |

## API

| Method | Path | Auth | What it does |
|---|---|---|---|
| POST | `/auth/register` | none | Create an account, returns a token |
| POST | `/auth/login` | none | Log in, returns a token |
| GET | `/events` | none | List events with seats left |
| GET | `/events/:id` | none | One event with its seat map |
| POST | `/events` | organizer | Create an event and its seats |
| POST | `/bookings` | attendee | Book a seat |
| GET | `/bookings/mine` | attendee | Your bookings |
| POST | `/bookings/:id/cancel` | attendee | Cancel a booking |

Send the token as `Authorization: Bearer <token>`.

# HANDOVER
## Changes made
**BACKEND**
1. Added a feature to reserve (hold) seats for 10 minutes when the seat is selected. Reservations persist through refreshes.
1. Pagination and server side search in all events API
1. Introduced an input validation layer using Zod
1. Auth was using a hardcoded JWT secret, now will use one from `.env` file
1. Sign up did not check for existing user first and would rely on DB conflict to throw error, now it checks first
1. Fixed a security bug where any user could cancel another user's booking
1. Fixed inconsistent response bodies for error messages not being sent in the right JSON field
1. Wrapped many routes in try/catch to prevent server crash
1. Improved latency by doing independent queries in `Promise.all()`

**FRONTEND**
1. Centralized the colors using CSS variables and Tailwind config as only a few common colors and gradients were used
1. API url was hardcoded as localhost, using `.env` variable now
1. Moved API calls to a `lib/api` directory with Typescript types for the responses and request bodies
1. Removed client search event searching, uses server side searching with pagination
1. Fix some toast messages being shown with wrong colors

## Pre-launch changes
1. Improve the auth module to use short lived tokens and long lived http-only refresh tokens. Also store short lived tokens in memory as localstorage is not safe.
1. More unit tests and integration tests for the backend
1. Proper error handling wrapper in the backend so internal unhandled error messages don't go to the client
1. Rate limiting

## Weakest part of my work
Two actually:
1. Frontend code could be much cleaner, did not spend enough time on it
1. User can still abuse the reservation system by swapping reservation with another seat, then reserving their old one back immediately. Could be prevented by having a measure where they can't reserve another seat for a short while after reserving one.

## Where the AI was wrong
I store the reservations in the `Reservations` table, with an expiration time that is set 10 minutes after. When fetching events or reservations, the AI insisted that it delete the expired reservations while fetching as well. I thought it would add unnecessary latency and just queried for reservations with an expiration time `> current time`, and then lazily delete the expired reservation when another user tried to reserve that seat.
