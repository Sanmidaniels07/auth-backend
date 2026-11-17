import { NextFunction, Request, Response } from "express";

/**
 * A small in-memory limiter for public endpoints that don't need a login
 * (guest checkout). Each client - by IP - gets `max` requests per `windowMs`.
 * In memory, so it's per server process and resets on restart; enough to
 * stop one person scripting fake orders (each unpaid order holds stock for
 * 15 minutes - utils/stockHold).
 */
// The app runs behind Render's proxy (no "trust proxy"), so req.ip is the
// proxy. The proxy appends the address that connected to it as the LAST
// X-Forwarded-For entry - earlier entries can be made up by the client.
const clientIp = (req: Request) => {
  const forwarded = req.headers["x-forwarded-for"];
  const list = (Array.isArray(forwarded) ? forwarded.join(",") : forwarded ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return list[list.length - 1] ?? req.socket.remoteAddress ?? "unknown";
};

export const rateLimit = ({ windowMs, max, message }: { windowMs: number; max: number; message: string }) => {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Forget old entries now and then so the map can't grow forever.
  setInterval(() => {
    const now = Date.now();
    hits.forEach((entry, key) => {
      if (entry.resetAt <= now) hits.delete(key);
    });
  }, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = clientIp(req);
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ success: false, message });
    }
    next();
  };
};
