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

type ReadyState = {
  ready: boolean;
  reason?: string;
  since?: string; // ISO
};

export function createApp() {
  const app = express();

  // Readiness flag: default to NOT ready until server.ts flips it true.
  app.locals.readyState = {
    ready: false,
    reason: "starting",
    since: new Date().toISOString(),
  } satisfies ReadyState;

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

  /**
   * Liveness: process is up.
   * Should return 200 unless the process is truly wedged.
   */
  app.get("/live", (_req: Request, res: Response) => {
    res.status(200).json({ status: "live" });
  });

  /**
   * Readiness: return 200 only when dependencies are OK AND app is ready to serve traffic.
   * Return 503 during startup and shutdown.
   */
  app.get("/ready", (_req: Request, res: Response) => {
    const state = (app.locals.readyState ?? { ready: false }) as ReadyState;

    if (!state.ready) {
      res.status(503).json({
        status: "not_ready",
        reason: state.reason ?? "unknown",
        since: state.since,
      });
      return;
    }

    res.status(200).json({ status: "ready", since: state.since });
  });

  /**
   * Backwards-compatible health endpoint:
   * treat it as readiness (common expectation in orchestrated environments).
   */
  app.get("/health", (req: Request, res: Response) => {
    // Delegate to readiness behavior to avoid "always 200" in prod.
    // (Keeps /health for existing checks/curl commands.)
    const state = (app.locals.readyState ?? { ready: false }) as ReadyState;

    if (!state.ready) {
      res.status(503).json({
        status: "not_ready",
        reason: state.reason ?? "unknown",
        since: state.since,
      });
      return;
    }

    res.status(200).json({ status: "ok", since: state.since });
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
