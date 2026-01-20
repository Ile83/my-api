import { Booking } from "../domain/booking";

class MemoryStore {
  private bookingsByRoom = new Map<string, Booking[]>();

  list(roomId: string): Booking[] {
    return (this.bookingsByRoom.get(roomId) ?? []).slice();
  }

  insert(roomId: string, booking: Booking): void {
    const list = this.bookingsByRoom.get(roomId) ?? [];
    list.push(booking);
    // Keep sorted by start time for consistent output (optional but nice).
    list.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
    this.bookingsByRoom.set(roomId, list);
  }

  remove(roomId: string, bookingId: string): boolean {
    const list = this.bookingsByRoom.get(roomId);
    if (!list) return false;

    const idx = list.findIndex((b) => b.id === bookingId);
    if (idx === -1) return false;

    list.splice(idx, 1);
    this.bookingsByRoom.set(roomId, list);
    return true;
  }

  find(roomId: string, bookingId: string): Booking | undefined {
    const list = this.bookingsByRoom.get(roomId) ?? [];
    return list.find((b) => b.id === bookingId);
  }
}

export const memoryStore = new MemoryStore();
