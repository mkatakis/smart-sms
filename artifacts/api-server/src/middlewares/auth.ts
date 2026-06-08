import { type Request, type Response, type NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.user = req.session.user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }
  next();
}
