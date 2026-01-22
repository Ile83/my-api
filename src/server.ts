import http from "node:http";
import { Socket } from "node:net";
import { createApp } from "./app";

/**
 * Basic structured logger without adding dependencies.
 * In production you would typically replace this with pino/winston.
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

  // Only accept base-10 integer ports.
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

const app = createApp();

// Keep references so we can drain connections on shutdown.
let server: http.Server | undefined;
const sockets = new Set<Socket>();

const SHUTDOWN_GRACE_MS = Number.isFinite(Number(process.env.SHUTDOWN_GRACE_MS))
  ? Number(process.env.SHUTDOWN_GRACE_MS)
  : 10_000;

let shuttingDown = false;

async function start() {
  // If you later add DB connections or other critical deps, do it here
  // *before* listening, and throw on failure to fail fast.
  // await connectToDatabase();

  server = http.createServer(app);

  // Track sockets so we can destroy long-lived keep-alive connections after grace period.
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    // Listen errors land here (e.g., EADDRINUSE, EACCES) when using server.listen().
    log.error("server_error", { code: err.code, message: err.message });
    process.exitCode = 1;
  });

  server.listen(PORT, () => {
    log.info("server_listening", { url: `http://localhost:${PORT}`, port: PORT });
  });
}

function beginShutdown(reason: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  log.warn("shutdown_started", { reason, graceMs: SHUTDOWN_GRACE_MS });

  // Stop accepting new connections. Existing connections are allowed to finish.
  if (!server) {
    log.warn("shutdown_no_server_reference");
    process.exit(1);
    return;
  }

  // Optional: if you implement readiness checks, flip readiness OFF here.
  // e.g., app.locals.ready = false;

  const forceTimer = setTimeout(() => {
    log.error("shutdown_force_exit", { openSockets: sockets.size });
    // Destroy open sockets to avoid hanging indefinitely (keep-alive, stuck clients).
    for (const s of sockets) s.destroy();
    process.exit(1);
  }, SHUTDOWN_GRACE_MS);

  // Allow the process to exit naturally if this is the only thing left.
  forceTimer.unref();

  server.close((err?: Error) => {
    if (err) {
      log.error("shutdown_server_close_error", { message: err.message });
      process.exit(1);
      return;
    }

    log.info("shutdown_complete");

    // If you open external resources (DB pools, queues), close them here:
    // await db.close();

    process.exit(0);
  });
}

process.on("SIGTERM", () => beginShutdown("SIGTERM"));
process.on("SIGINT", () => beginShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  log.error("unhandled_rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  // In production, unhandled rejections should generally terminate after logging.
  beginShutdown("unhandledRejection");
});

process.on("uncaughtException", (err) => {
  log.error("uncaught_exception", { message: err.message, stack: err.stack });
  // Uncaught exceptions mean the process is in an unknown state; terminate gracefully.
  beginShutdown("uncaughtException");
});

start().catch((err: unknown) => {
  const e = err instanceof Error ? err : new Error(String(err));
  log.error("startup_failed", { message: e.message, stack: e.stack });
  process.exit(1);
});
