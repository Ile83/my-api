# Meeting Room Booking API

## Overview

This project implements a simple REST API for managing meeting room bookings. The goal is to demonstrate clean API design, request validation, domain-level time logic, and safe handling of concurrent requests using an in-memory data store.

The implementation is intentionally lightweight and focuses on correctness, clarity, and reviewability rather than production infrastructure.

---

## Tech Stack

* **Node.js**
* **TypeScript**
* **Express** (HTTP server and routing)
* **Zod** (request validation)
* **UUID** (booking identifiers)

**Storage:**

* In-memory data store (Map-based, scoped per room)

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

### Development mode (auto-reload)

```bash
npm run dev
```

### Production build

```bash
npm run build
npm start
```

The server starts on `http://localhost:3000` by default (or the port defined in `PORT`).

---

## API Endpoints

### List bookings for a room

```
GET /rooms/:roomId/bookings
```

**Response**

* `200 OK` – list of bookings

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
* `404 Not Found` – booking does not exist

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
* Overlap detection uses half-open intervals: **[start, end)**

  * A booking ending at 10:00 does **not** overlap with a booking starting at 10:00
* Bookings are isolated per room (`roomId`)

---

## Error Handling

* Validation errors return `400 Bad Request` with descriptive messages
* Booking conflicts return `409 Conflict`
* Missing resources return `404 Not Found`
* Errors are returned as JSON objects with clear error codes

---

## Limitations

* All data is stored in memory and is lost when the server restarts
* No authentication or authorization
* No persistent database
* Designed for demonstration and evaluation purposes, not direct production use

---

## Development Notes

This project follows an **AI-first → human-refactor → analysis** workflow.

For a detailed discussion of:

* what the AI-generated code did well
* what required correction
* and why specific refactoring decisions were made

see `ANALYYSI.md`.
