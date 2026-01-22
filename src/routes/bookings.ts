import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4, validate as uuidValidate } from "uuid";
import { createBookingSchema } from "../validation/schemas";
import { memoryStore } from "../store/memoryStore";
import { intervalsOverlap, toInterval, Booking } from "../domain/booking";

export const bookingsRouter = Router();

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

/**
 * Express 4 safe async wrapper.
 * Express 5 handles async errors better, but keeping this is harmless.
 */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validate identifiers.
 */
function validateRoomId(roomId: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(roomId);
}
function validateBookingId(bookingId: string): boolean {
  return uuidValidate(bookingId);
}

/**
 * GET /rooms/:roomId/bookings
 * Optional pagination: ?limit=50&offset=0
 */
bookingsRouter.get("/rooms/:roomId/bookings", (req: Request, res: Response) => {
  const { roomId } = req.params;

  if (!validateRoomId(roomId)) {
    return res.status(400).json({ error: "validation_error", message: "Invalid roomId." });
  }

  const limitRaw = req.query.limit;
  const offsetRaw = req.query.offset;

  const limit = typeof limitRaw === "string" ? Number(limitRaw) : DEFAULT_LIMIT;
  const offset = typeof offsetRaw === "string" ? Number(offsetRaw) : 0;

  if (
    !Number.isFinite(limit) ||
    !Number.isFinite(offset) ||
    !Number.isInteger(limit) ||
    !Number.isInteger(offset) ||
    limit < 1 ||
    offset < 0 ||
    limit > MAX_LIMIT
  ) {
    return res.status(400).json({
      error: "validation_error",
      message: `Invalid pagination parameters. Use limit=1..${MAX_LIMIT} and offset>=0 (integers).`
    });
  }

  const all = memoryStore.list(roomId);
  const page = all.slice(offset, offset + limit);

  return res.status(200).json({
    items: page,
    total: all.length,
    limit,
    offset
  });
});

/**
 * POST /rooms/:roomId/bookings
 * - validates body with zod
 * - prevents unhandled exceptions from toInterval()
 * - uses atomic store operation to prevent race-condition double-booking
 */
bookingsRouter.post(
  "/rooms/:roomId/bookings",
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    if (!validateRoomId(roomId)) {
      return res.status(400).json({ error: "validation_error", message: "Invalid roomId." });
    }

    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation_error",
        message: "Invalid request body",
        details: parsed.error.flatten()
      });
    }

    const { startTime, endTime } = parsed.data;

    // Convert requested interval safely
    let requested: ReturnType<typeof toInterval>;
    try {
      requested = toInterval(startTime, endTime);
    } catch (err) {
      return res.status(400).json({
        error: "validation_error",
        message: "Invalid time range.",
        details: err instanceof Error ? err.message : String(err)
      });
    }

    const booking: Booking = {
      id: uuidv4(),
      roomId,
      startTime,
      endTime,
      createdAt: new Date().toISOString()
    };

    // Non-throwing overlap predicate:
    // If stored interval is invalid/corrupt, treat it as overlapping (safer than double-booking).
    const result = await memoryStore.insertIfNoOverlap(roomId, booking, (existing) => {
      try {
        const other = toInterval(existing.startTime, existing.endTime);
        return intervalsOverlap(requested, other);
      } catch {
        return true; // safest policy: block creation if existing data is inconsistent
      }
    });

    if (!result.ok) {
      return res.status(409).json({
        error: "overlap",
        message: "Room is already booked for the requested time range."
      });
    }

    // Optional: Location header for the created resource
    res.setHeader("Location", `/rooms/${encodeURIComponent(roomId)}/bookings/${result.booking.id}`);

    return res.status(201).json(result.booking);
  })
);

/**
 * DELETE /rooms/:roomId/bookings/:bookingId
 * Uses store lock to avoid races with concurrent writes.
 */
bookingsRouter.delete(
  "/rooms/:roomId/bookings/:bookingId",
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId, bookingId } = req.params;

    if (!validateRoomId(roomId)) {
      return res.status(400).json({ error: "validation_error", message: "Invalid roomId." });
    }
    if (!validateBookingId(bookingId)) {
      return res.status(400).json({
        error: "validation_error",
        message: "Invalid bookingId (must be a UUID)."
      });
    }

    const removed = await memoryStore.removeIfExists(roomId, bookingId);
    if (!removed) {
      return res.status(404).json({ error: "not_found", message: "Booking not found." });
    }

    return res.status(204).send();
  })
);
