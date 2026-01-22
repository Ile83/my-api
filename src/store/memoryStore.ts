import type { Booking } from "../domain/booking";

type RoomId = string;

type RoomState = {
  byId: Map<string, Booking>;
};

type Store = Map<RoomId, RoomState>;

/**
 * Minimal async mutex (FIFO-ish) per key.
 * - No memory leak: we delete the key when the tail finishes and hasn't been replaced.
 */
class KeyedMutex {
  private tails = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, fn: () => T | Promise<T>): Promise<T> {
    const previousTail = this.tails.get(key) ?? Promise.resolve();

    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    // Important: store the exact tail promise instance we create here
    const tail = previousTail.then(() => current);
    this.tails.set(key, tail);

    await previousTail;

    try {
      return await fn();
    } finally {
      release();
      // Cleanup when our "current" completes, but only if nothing else replaced the tail
      current.finally(() => {
        if (this.tails.get(key) === tail) this.tails.delete(key);
      });
    }
  }
}

const store: Store = new Map();
const mutex = new KeyedMutex();

/**
 * Optional safety limits (useful even in demos).
 * Tune or remove depending on assignment requirements.
 */
const LIMITS = {
  MAX_ROOMS: 10_000,
  MAX_BOOKINGS_PER_ROOM: 50_000,
  MAX_TOTAL_BOOKINGS: 250_000
};

let totalBookings = 0;

function getRoom(roomId: string): RoomState | undefined {
  return store.get(roomId);
}

function getOrCreateRoom(roomId: string): RoomState {
  let room = store.get(roomId);
  if (room) return room;

  if (store.size >= LIMITS.MAX_ROOMS) {
    throw new Error("Room capacity exceeded");
  }

  room = { byId: new Map<string, Booking>() };
  store.set(roomId, room);
  return room;
}

export const memoryStore = {
  /**
   * Read-only operations (not locked).
   * They return copies to avoid external mutation.
   */
  list(roomId: string): Booking[] {
    const room = getRoom(roomId);
    if (!room) return [];
    return Array.from(room.byId.values());
  },

  find(roomId: string, bookingId: string): Booking | undefined {
    return getRoom(roomId)?.byId.get(bookingId);
  },

  /**
   * Atomic insert with overlap predicate.
   * overlap(existing) should return true if there is a conflict.
   */
  async insertIfNoOverlap(
    roomId: string,
    booking: Booking,
    overlap: (existing: Booking) => boolean
  ): Promise<{ ok: true; booking: Booking } | { ok: false }> {
    return mutex.runExclusive(roomId, () => {
      const room = getOrCreateRoom(roomId);

      if (totalBookings >= LIMITS.MAX_TOTAL_BOOKINGS) {
        throw new Error("Total booking capacity exceeded");
      }
      if (room.byId.size >= LIMITS.MAX_BOOKINGS_PER_ROOM) {
        throw new Error("Room booking capacity exceeded");
      }

      // Prevent duplicate IDs inside a room (defensive)
      if (room.byId.has(booking.id)) {
        throw new Error("Duplicate booking id");
      }

      // Overlap check (O(n) per room) – acceptable for in-memory demo.
      // For production you’d use a DB + indexed queries.
      for (const existing of room.byId.values()) {
        if (overlap(existing)) return { ok: false as const };
      }

      room.byId.set(booking.id, booking);
      totalBookings += 1;

      return { ok: true as const, booking };
    });
  },

  /**
   * Atomic remove (O(1)).
   */
  async removeIfExists(roomId: string, bookingId: string): Promise<boolean> {
    return mutex.runExclusive(roomId, () => {
      const room = getRoom(roomId);
      if (!room) return false;

      const existed = room.byId.delete(bookingId);
      if (existed) totalBookings -= 1;

      // Optional cleanup of empty rooms
      if (room.byId.size === 0) store.delete(roomId);

      return existed;
    });
  }
};
