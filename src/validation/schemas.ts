import { z } from "zod";

export const createBookingSchema = z
  .object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime()
  })
  .superRefine((val, ctx) => {
    const startMs = Date.parse(val.startTime);
    const endMs = Date.parse(val.endTime);

    if (!Number.isFinite(startMs)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "startTime is not a valid datetime", path: ["startTime"] });
      return;
    }
    if (!Number.isFinite(endMs)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "endTime is not a valid datetime", path: ["endTime"] });
      return;
    }

    if (startMs >= endMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startTime must be before endTime",
        path: ["startTime"]
      });
    }

    const now = Date.now();
    if (startMs < now) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bookings in the past are not allowed",
        path: ["startTime"]
      });
    }
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
