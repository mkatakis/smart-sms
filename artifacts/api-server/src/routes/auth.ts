import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/login", async (req, res): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role as "admin" | "reseller",
    resellerId: user.resellerId ?? null,
  };

  req.log.info({ userId: user.id, role: user.role }, "User logged in");
  res.json({ id: user.id, username: user.username, role: user.role, resellerId: user.resellerId ?? null });
});

router.post("/logout", (req, res): void => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/me", (req, res): void => {
  if (!req.session?.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(req.session.user);
});

export default router;
