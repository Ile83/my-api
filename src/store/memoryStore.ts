import type { Booking } from "../domain/booking";

type RoomId = string;

type Store = Map<RoomId, Booking[]>;

/**
 * Minimal async mutex (FIFO) per key.
 */
class KeyedMutex {
  private locks = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, fn: () => T | Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();

    let release!: () => void;
    const current = new Promise<void>((resolve) => (release = resolve));

    // Chain the lock
    this.locks.set(key, previous.then(() => current));

    // Wait for previous holder
    await previous;

    try {
      return await fn();
    } finally {
      release();
      // Cleanup if no one queued behind us (best-effort)
      if (this.locks.get(key) === previous.then(() => current)) {
        // This equality check is not reliable due to new Promise chains;
        // keep it simple: cleanup when chain completes.
        current.then(() => {
          // If nothing else replaced it, delete.
          if (this.locks.get(key) === previous.then(() => current)) this.locks.delete(key);
        });
      }
    }
  }
}

const store: Store = new Map();
const mutex = new KeyedMutex();

function ensureRoom(roomId: string): Booking[] {
  const existing = store.get(roomId);
  if (existing) return existing;
  const arr: Booking[] = [];
  store.set(roomId, arr);
  return arr;
}

export const memoryStore = {
  list(roomId: string): Booking[] {
    // Return a copy to avoid accidental external mutation
    return [...(store.get(roomId) ?? [])];
  },

  find(roomId: string, bookingId: string): Booking | undefined {
    return (store.get(roomId) ?? []).find((b) => b.id === bookingId);
  },

  insert(roomId: string, booking: Booking): void {
    const arr = ensureRoom(roomId);
    arr.push(booking);
  },

  remove(roomId: string, bookingId: string): void {
    const arr = ensureRoom(roomId);
    const idx = arr.findIndex((b) => b.id === bookingId);
    if (idx >= 0) arr.splice(idx, 1);
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
      const arr = ensureRoom(roomId);

      const hasOverlap = arr.some(overlap);
      if (hasOverlap) return { ok: false as const };

      arr.push(booking);
      return { ok: true as const, booking };
    });
  },

  /**
   * Atomic remove
   */
  async removeIfExists(roomId: string, bookingId: string): Promise<boolean> {
    return mutex.runExclusive(roomId, () => {
      const arr = ensureRoom(roomId);
      const idx = arr.findIndex((b) => b.id === bookingId);
      if (idx < 0) return false;
      arr.splice(idx, 1);
      return true;
    });
  }
};
