import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { createBookingSchema } from "../validation/schemas";
import { memoryStore } from "../store/memoryStore";
import { intervalsOverlap, toInterval, Booking } from "../domain/booking";

export const bookingsRouter = Router();

/**
 * GET /rooms/:roomId/bookings
 */
bookingsRouter.get("/rooms/:roomId/bookings", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const bookings = memoryStore.list(roomId);
  res.status(200).json(bookings);
});

/**
 * POST /rooms/:roomId/bookings
 */
bookingsRouter.post("/rooms/:roomId/bookings", (req: Request, res: Response) => {
  const { roomId } = req.params;

  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      message: "Invalid request body",
      details: parsed.error.flatten()
    });
  }

  const { startTime, endTime } = parsed.data;

  const requested = toInterval(startTime, endTime);
  const existing = memoryStore.list(roomId);

  const hasOverlap = existing.some((b) => {
    const other = toInterval(b.startTime, b.endTime);
    return intervalsOverlap(requested, other);
  });

  if (hasOverlap) {
    return res.status(409).json({
      error: "overlap",
      message: "Room is already booked for the requested time range."
    });
  }

  const booking: Booking = {
    id: uuidv4(),
    roomId,
    startTime,
    endTime,
    createdAt: new Date().toISOString()
  };

  memoryStore.insert(roomId, booking);
  return res.status(201).json(booking);
});

/**
 * DELETE /rooms/:roomId/bookings/:bookingId
 */
bookingsRouter.delete("/rooms/:roomId/bookings/:bookingId", (req: Request, res: Response) => {
  const { roomId, bookingId } = req.params;

  const exists = memoryStore.find(roomId, bookingId);
  if (!exists) {
    return res.status(404).json({
      error: "not_found",
      message: "Booking not found."
    });
  }

  memoryStore.remove(roomId, bookingId);
  return res.status(204).send();
});
