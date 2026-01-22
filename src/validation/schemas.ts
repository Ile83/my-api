import { z } from "zod";

export type CreateBookingParsed = {
  startTime: string;
  endTime: string;
  startMs: number;
  endMs: number;
};

type BookingRules = {
  maxHorizonMs: number;     // e.g., 365 days
  minDurationMs: number;    // e.g., 15 minutes
  maxDurationMs: number;    // e.g., 8 hours
  clockSkewGraceMs: number; // e.g., 5 seconds
};

const defaultRules: BookingRules = {
  maxHorizonMs: 365 * 24 * 60 * 60 * 1000,
  minDurationMs: 15 * 60 * 1000,
  maxDurationMs: 8 * 60 * 60 * 1000,
  clockSkewGraceMs: 5 * 1000,
};

// Factory so you can inject time in tests and avoid stateful schemas
export function makeCreateBookingSchema(
  nowMs: () => number = () => Date.now(),
  rules: BookingRules = defaultRules
) {
  return z
    .object({
      // Require timezone offset to avoid ambiguous local-time strings
      startTime: z.string().datetime({ offset: true }),
      endTime: z.string().datetime({ offset: true }),
    })
    .transform((val): CreateBookingParsed => {
      const startMs = Date.parse(val.startTime);
      const endMs = Date.parse(val.endTime);
      return { ...val, startMs, endMs };
    })
    .superRefine((val, ctx) => {
      // If you trust datetime({ offset: true }) you can omit these, but keeping them is safe.
      if (!Number.isFinite(val.startMs)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "startTime is not a valid datetime",
          path: ["startTime"],
        });
        return;
      }
      if (!Number.isFinite(val.endMs)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "endTime is not a valid datetime",
          path: ["endTime"],
        });
        return;
      }

      if (val.startMs >= val.endMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "startTime must be before endTime",
          path: ["startTime"],
        });
        return;
      }

      const duration = val.endMs - val.startMs;
      if (duration < rules.minDurationMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Booking duration must be at least ${Math.round(rules.minDurationMs / 60000)} minutes`,
          path: ["endTime"],
        });
      }
      if (duration > rules.maxDurationMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Booking duration must be at most ${Math.round(rules.maxDurationMs / 3600000)} hours`,
          path: ["endTime"],
        });
      }

      const now = nowMs();

      // Grace window prevents “I booked for now” failures and minor clock skew issues
      if (val.startMs < now - rules.clockSkewGraceMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bookings in the past are not allowed",
          path: ["startTime"],
        });
      }

      if (val.startMs > now + rules.maxHorizonMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Bookings cannot be made more than ${Math.round(rules.maxHorizonMs / 86400000)} days in advance`,
          path: ["startTime"],
        });
      }
    });
}

// Typical exports for app usage
export const createBookingSchema = makeCreateBookingSchema();
export type CreateBookingInput = z.input<typeof createBookingSchema>;   // { startTime, endTime }
export type CreateBookingOutput = z.output<typeof createBookingSchema>; // includes startMs/endMs
