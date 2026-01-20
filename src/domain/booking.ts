export type Booking = {
  id: string;
  roomId: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  createdAt: string; // ISO 8601
};

export type BookingInterval = {
  startMs: number;
  endMs: number;
};

/**
 * Half-open interval overlap check: [start, end)
 * Overlaps if A.start < B.end AND B.start < A.end.
 */
export function intervalsOverlap(a: BookingInterval, b: BookingInterval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

export function toInterval(startIso: string, endIso: string): BookingInterval {
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  return { startMs, endMs };
}
