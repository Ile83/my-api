booking.ts 

Critical Issues:

No input validation in toInterval - Date.parse() returns NaN for invalid date strings, but the function doesn't check for this. This means invalid dates silently propagate through the system, and intervalsOverlap will return false when comparing NaN values, potentially allowing double-bookings.

No interval validity check - The code doesn't verify that endTime comes after startTime. A booking with inverted times would pass through unchecked, likely causing incorrect overlap detection.

Silent failures - When Date.parse() fails, there's no error thrown or logged. Invalid data flows through the system undetected, making bugs difficult to diagnose.

refactored booking.ts

Rejects invalid ISO inputs (including NaN parse results)

Enforces interval validity (end > start), and optionally rejects zero-length intervals

Produces descriptive, actionable error messages

Gives you a choice of throwing (simple) or Result-style (explicit control flow)

Adds JSDoc so behavior is unambiguous