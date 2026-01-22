export type Booking = {
  id: string;
  roomId: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  createdAt: string; // ISO 8601
};

export type BookingInterval = {
  startMs: number;
  endMs: number;
};

export class BookingTimeError extends Error {
  readonly name = "BookingTimeError";
  constructor(message: string) {
    super(message);
  }
}

/**
 * Half-open interval overlap check: [start, end)
 * Overlaps if A.start < B.end AND B.start < A.end.
 *
 * @param a Interval A in milliseconds since epoch
 * @param b Interval B in milliseconds since epoch
 * @returns true if the intervals overlap, false otherwise
 */
export function intervalsOverlap(a: BookingInterval, b: BookingInterval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

/**
 * Parse and validate an ISO-8601 start/end pair into a half-open interval [start, end).
 *
 * Validation rules:
 * - startIso and endIso must be valid date-time strings parseable to finite epoch milliseconds
 * - end must be strictly greater than start (non-zero duration)
 *
 * @throws {BookingTimeError} if parsing fails or the interval is invalid
 */
export function toInterval(startIso: string, endIso: string): BookingInterval {
  const startMs = Date.parse(startIso);
  if (!Number.isFinite(startMs)) {
    throw new BookingTimeError(`Invalid startTime ISO string: "${startIso}"`);
  }

  const endMs = Date.parse(endIso);
  if (!Number.isFinite(endMs)) {
    throw new BookingTimeError(`Invalid endTime ISO string: "${endIso}"`);
  }

  if (endMs <= startMs) {
    throw new BookingTimeError(
      `Invalid interval: endTime must be after startTime (start="${startIso}", end="${endIso}")`
    );
  }

  return { startMs, endMs };
}

/**
 * Convenience helper: validate a Booking object’s time fields and convert to interval.
 *
 * @throws {BookingTimeError} if booking.startTime/endTime are invalid
 */
export function bookingToInterval(booking: Pick<Booking, "startTime" | "endTime">): BookingInterval {
  return toInterval(booking.startTime, booking.endTime);
}
