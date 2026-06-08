import "express-session";

export type SessionUser = {
  id: number;
  username: string;
  role: "admin" | "reseller";
  resellerId: number | null;
};

declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}
