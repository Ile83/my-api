import http from "node:http";
import type { Socket } from "node:net";
import { createApp } from "./app";

/**
 * Minimal structured logger without extra dependencies.
 * Replace with pino/winston in real production if desired.
 */
const log = {
  info: (msg: string, meta: Record<string, unknown> = {}) =>
    console.log(JSON.stringify({ level: "info", msg, time: new Date().toISOString(), ...meta })),
  warn: (msg: string, meta: Record<string, unknown> = {}) =>
    console.warn(JSON.stringify({ level: "warn", msg, time: new Date().toISOString(), ...meta })),
  error: (msg: string, meta: Record<string, unknown> = {}) =>
    console.error(JSON.stringify({ level: "error", msg, time: new Date().toISOString(), ...meta })),
};

function parsePort(envValue: string | undefined, fallback: number): number {
  if (envValue == null || envValue.trim() === "") return fallback;

  if (!/^\d+$/.test(envValue.trim())) {
    throw new Error(`Invalid PORT value "${envValue}". Must be an integer between 1 and 65535.`);
  }

  const port = Number(envValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value "${envValue}". Must be an integer between 1 and 65535.`);
  }

  return port;
}

const PORT = parsePort(process.env.PORT, 3000);

const SHUTDOWN_GRACE_MS = Number.isFinite(Number(process.env.SHUTDOWN_GRACE_MS))
  ? Number(process.env.SHUTDOWN_GRACE_MS)
  : 10_000;

const app = createApp();

type ReadyState = {
  ready: boolean;
  reason?: string;
  since: string; // ISO
};

function setReady(ready: boolean, reason?: string) {
  const state: ReadyState = {
    ready,
    reason,
    since: new Date().toISOString(),
  };
  app.locals.readyState = state;
}

let server: http.Server | undefined;
const sockets = new Set<Socket>();
let shuttingDown = false;

async function start() {
  // Ensure not-ready until we are actually listening and dependencies (if any) are OK.
  setReady(false, "starting");

  // If you later add critical dependencies, validate/connect here BEFORE listen().
  // Example:
  // await connectToDatabase();
  // setReady(false, "db_connecting");
  // await db.ping();

  server = http.createServer(app);

  // Track sockets so we can force-close keep-alive connections after grace period.
  server.on("connection", (socket: Socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    // EADDRINUSE, EACCES, etc.
    log.error("server_error", { code: err.code, message: err.message });
    setReady(false, `server_error:${err.code ?? "unknown"}`);
    process.exitCode = 1;
  });

  server.listen(PORT, () => {
    // Mark ready only after binding succeeded and we are accepting connections.
    setReady(true);
    log.info("server_listening", { url: `http://localhost:${PORT}`, port: PORT });
  });
}

function beginShutdown(reason: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  // Immediately become not-ready so Kubernetes / LB stops routing traffic here.
  setReady(false, `shutting_down:${reason}`);

  log.warn("shutdown_started", { reason, graceMs: SHUTDOWN_GRACE_MS });

  if (!server) {
    log.error("shutdown_no_server_reference");
    process.exit(1);
    return;
  }

  // Stop accepting new connections; allow in-flight requests to finish.
  const forceTimer = setTimeout(() => {
    log.error("shutdown_force_exit", { openSockets: sockets.size });
    for (const s of sockets) s.destroy();
    process.exit(1);
  }, SHUTDOWN_GRACE_MS);

  // Allow process to exit naturally if this is the only thing left.
  forceTimer.unref();

  server.close((err?: Error) => {
    if (err) {
      log.error("shutdown_server_close_error", { message: err.message });
      process.exit(1);
      return;
    }

    log.info("shutdown_complete");
    process.exit(0);
  });
}

process.on("SIGTERM", () => beginShutdown("SIGTERM"));
process.on("SIGINT", () => beginShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  log.error("unhandled_rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  // Safer default: terminate gracefully (process may be in unknown state).
  beginShutdown("unhandledRejection");
});

process.on("uncaughtException", (err) => {
  log.error("uncaught_exception", { message: err.message, stack: err.stack });
  // Uncaught exceptions mean state is undefined; terminate gracefully.
  beginShutdown("uncaughtException");
});

start().catch((err: unknown) => {
  const e = err instanceof Error ? err : new Error(String(err));
  log.error("startup_failed", { message: e.message, stack: e.stack });
  setReady(false, "startup_failed");
  process.exit(1);
});
