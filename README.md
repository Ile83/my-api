# Meeting Room Booking API

## Overview

This repository contains a TypeScript-based REST API for managing meeting room bookings. The project demonstrates how to design a small but robust backend service with clear domain logic, strong validation, and safe handling of concurrent requests.

The API was developed using an **AI-first → human-refactor → analysis** workflow. An initial AI-generated baseline was incrementally improved to address correctness, concurrency, validation, and maintainability concerns. The final result intentionally remains simple, readable, and review-friendly.

---

## Tech Stack

* **Node.js** (runtime)
* **TypeScript** (static typing and maintainability)
* **Express** (HTTP server and routing)
* **Zod** (request validation and business rule enforcement)
* **UUID** (unique booking identifiers)

**Storage**

* In-memory store (Map-based)
* Per-room locking to prevent concurrent double bookings

---

## Project Structure

```
src/
  app.ts            # Express app configuration and middleware
  server.ts         # Server startup and lifecycle handling
  routes/
    bookings.ts     # REST endpoints for bookings
  domain/
    booking.ts      # Domain types and interval overlap logic
  validation/
    schemas.ts      # Zod schemas and business validation rules
  store/
    memoryStore.ts  # In-memory store with per-room mutex

ANALYYSI.md         # Analysis of AI-generated code and refactoring decisions
PROMPTIT.md         # Prompts and AI responses used during development
README.md
```

---

## Requirements

* Node.js 18 or newer
* npm

---

## Installation

```bash
npm install
```

---

## Running the Application

### Development mode

```bash
npm run dev
```

### Production build

```bash
npm run build
npm start
```

By default, the server runs on `http://localhost:3000` (or the port defined in the `PORT` environment variable).

---

## API Endpoints

### List bookings for a room

```
GET /rooms/:roomId/bookings
```

Optional query parameters:

* `limit` (integer, default 100)
* `offset` (integer, default 0)

**Response**

* `200 OK` – paginated list of bookings

```json
{
  "items": [ /* Booking[] */ ],
  "total": 3,
  "limit": 100,
  "offset": 0
}
```

**Example**

```bash
curl -s "http://localhost:3000/rooms/alpha/bookings"
```

---

### Create a booking

```
POST /rooms/:roomId/bookings
```

**Request body**

```json
{
  "startTime": "2026-02-01T10:00:00.000Z",
  "endTime": "2026-02-01T11:00:00.000Z"
}
```

**Responses**

* `201 Created` – booking created successfully
* `400 Bad Request` – validation error
* `409 Conflict` – booking overlaps an existing booking

**Example (Windows CMD)**

```bash
curl -s -X POST "http://localhost:3000/rooms/alpha/bookings" ^
  -H "Content-Type: application/json" ^
  -d "{\"startTime\":\"2026-02-01T10:00:00.000Z\",\"endTime\":\"2026-02-01T11:00:00.000Z\"}"
```

---

### Delete a booking

```
DELETE /rooms/:roomId/bookings/:bookingId
```

**Responses**

* `204 No Content` – booking deleted
* `404 Not Found` – booking not found

**Example**

```bash
curl -i -X DELETE "http://localhost:3000/rooms/alpha/bookings/<bookingId>"
```

---

## Business Rules & Assumptions

* All timestamps must be valid ISO 8601 strings with timezone information
* Server time is used as the source of truth
* Bookings in the past are rejected
* `startTime` must be strictly before `endTime`
* Booking duration and time horizon limits are enforced in validation
* Overlap detection uses half-open intervals: **[start, end)**

  * A booking ending at 10:00 does **not** overlap with one starting at 10:00
* Bookings are scoped per room (`roomId`)
* Concurrent booking creation for the same room is serialized using a per-room mutex

---

## Error Handling

* Validation errors return `400 Bad Request` with descriptive messages
* Overlapping bookings return `409 Conflict`
* Missing resources return `404 Not Found`
* Errors are returned as structured JSON responses
* Async route handlers are wrapped to ensure rejected promises are properly handled

---

## Limitations

* All data is stored in memory and is lost when the server restarts
* No authentication or authorization
* No persistent database
* Designed for demonstration and evaluation purposes, not direct production use

---

## Development Notes

This project was developed as part of a technical assignment emphasizing:

* Correctness over feature count
* Explicit business rules and assumptions
* Safe concurrency handling
* Clear separation between routing, validation, domain logic, and storage

A detailed discussion of AI-generated code, identified issues, and refactoring decisions can be found in `ANALYYSI.md`.
