import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import { bookingsRouter } from "./routes/bookings";

/**
 * If you are on Express 4 and you use async handlers in routers, wrap them with this.
 * Express 5 largely removes the need for it, but it is harmless to keep.
 */
export function asyncHandler<
  Req extends Request = Request,
  Res extends Response = Response
>(fn: (req: Req, res: Res, next: NextFunction) => Promise<unknown>) {
  return (req: Req, res: Res, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createApp() {
  const app = express();

  // Trust proxy if you’re behind a reverse proxy (common in production).
  // If you run directly on the internet without a proxy, keep it false.
  app.set("trust proxy", 1);

  // Correlation / request ID
  app.use((req, _res, next) => {
    const existing = req.header("x-request-id");
    (req as any).id = existing ?? randomUUID();
    next();
  });

  // Structured request logging
  app.use(
    pinoHttp({
      redact: ["req.headers.authorization"],
      customProps: (req) => ({ requestId: (req as any).id }),
    })
  );

  // Security headers baseline
  app.use(
    helmet({
      // For JSON APIs, you typically don’t need CSP unless you serve HTML.
      contentSecurityPolicy: false,
    })
  );

  // Limit JSON payload size
  app.use(express.json({ limit: "100kb" }));

  // Basic rate limiting (tune per environment)
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120, // 120 req/min per IP
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Health endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  // Routes
  app.use(bookingsRouter);

  // 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "not_found", message: "Route not found." });
  });

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    // Always log server-side with requestId for correlation
    (req as any).log?.error({ err }, "Unhandled error");

    // Avoid leaking internals by default
    res.status(500).json({
      error: "internal_error",
      message: "Unexpected server error.",
      requestId: (req as any).id,
    });
  });

  return app;
}
