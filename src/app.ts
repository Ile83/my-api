import express, { Request, Response, NextFunction } from "express";
import { bookingsRouter } from "./routes/bookings";

export function createApp() {
  const app = express();

  app.use(express.json());

  // Simple health endpoint (optional but helpful)
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(bookingsRouter);

  // Basic 404 for unknown routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "not_found", message: "Route not found." });
  });

  // Basic error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "internal_error", message: "Unexpected server error." });
  });

  return app;
}
