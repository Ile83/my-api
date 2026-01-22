import { Router, Request, Response } from "express";
import { v4 as uuidv4, validate as uuidValidate } from "uuid";
import { createBookingSchema } from "../validation/schemas";
import { memoryStore } from "../store/memoryStore";
import { intervalsOverlap, toInterval, Booking } from "../domain/booking";

export const bookingsRouter = Router();

/**
 * Small helper: validate roomId/bookingId.
 * Adjust rules to match your assignment requirements:
 * - roomId: allow [a-zA-Z0-9_-] (common for human IDs like "alpha")
 * - bookingId: must be UUID
 */
function validateRoomId(roomId: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(roomId);
}
function validateBookingId(bookingId: string): boolean {
  return uuidValidate(bookingId);
}

/**
 * GET /rooms/:roomId/bookings
 * Adds optional pagination: ?limit=50&offset=0
 */
bookingsRouter.get("/rooms/:roomId/bookings", (req: Request, res: Response) => {
  const { roomId } = req.params;

  if (!validateRoomId(roomId)) {
    return res.status(400).json({
      error: "validation_error",
      message: "Invalid roomId."
    });
  }

  const limitRaw = req.query.limit;
  const offsetRaw = req.query.offset;

  const limit = typeof limitRaw === "string" ? Number(limitRaw) : 100;
  const offset = typeof offsetRaw === "string" ? Number(offsetRaw) : 0;

  if (!Number.isFinite(limit) || !Number.isFinite(offset) || limit < 1 || offset < 0 || limit > 500) {
    return res.status(400).json({
      error: "validation_error",
      message: "Invalid pagination parameters. Use limit=1..500 and offset>=0."
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
 * - catches interval conversion errors
 * - uses atomic store operation to prevent race-condition double-booking
 */
bookingsRouter.post("/rooms/:roomId/bookings", async (req: Request, res: Response) => {
  const { roomId } = req.params;

  if (!validateRoomId(roomId)) {
    return res.status(400).json({
      error: "validation_error",
      message: "Invalid roomId."
    });
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

  // 1) Prevent unhandled exceptions from toInterval()
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

  // 2) Atomic overlap-check + insert (store-level lock per room)
  const result = await memoryStore.insertIfNoOverlap(roomId, booking, (existing) => {
    const other = toInterval(existing.startTime, existing.endTime);
    return intervalsOverlap(requested, other);
  });

  if (!result.ok) {
    return res.status(409).json({
      error: "overlap",
      message: "Room is already booked for the requested time range."
    });
  }

  return res.status(201).json(result.booking);
});

/**
 * DELETE /rooms/:roomId/bookings/:bookingId
 * Uses store lock to avoid races with concurrent writes.
 */
bookingsRouter.delete("/rooms/:roomId/bookings/:bookingId", async (req: Request, res: Response) => {
  const { roomId, bookingId } = req.params;

  if (!validateRoomId(roomId)) {
    return res.status(400).json({
      error: "validation_error",
      message: "Invalid roomId."
    });
  }
  if (!validateBookingId(bookingId)) {
    return res.status(400).json({
      error: "validation_error",
      message: "Invalid bookingId (must be a UUID)."
    });
  }

  const removed = await memoryStore.removeIfExists(roomId, bookingId);
  if (!removed) {
    return res.status(404).json({
      error: "not_found",
      message: "Booking not found."
    });
  }

  return res.status(204).send();
});
