import { Router, type IRouter } from "express";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import bcrypt from "bcrypt";
import { db, resellersTable, creditTransactionsTable, usersTable } from "@workspace/db";
import {
  ListResellersQueryParams,
  CreateResellerBody,
  GetResellerParams,
  UpdateResellerParams,
  UpdateResellerBody,
  DeleteResellerParams,
  TopupResellerCreditsParams,
  TopupResellerCreditsBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { randomBytes } from "crypto";

const router: IRouter = Router();

router.get("/resellers", requireAdmin, async (req, res): Promise<void> => {
  const query = ListResellersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions: SQL[] = [];
  if (query.data.status) conditions.push(eq(resellersTable.status, query.data.status));
  if (query.data.search) conditions.push(ilike(resellersTable.name, `%${query.data.search}%`));

  const resellers = await db
    .select()
    .from(resellersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(resellersTable.createdAt);

  res.json(resellers);
});

router.post("/resellers", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateResellerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = req.body as { username?: string; password?: string };

  const apiKey = `rk_${randomBytes(16).toString("hex")}`;
  const [reseller] = await db
    .insert(resellersTable)
    .values({ ...parsed.data, apiKey, credits: parsed.data.credits ?? 0 })
    .returning();

  if (username && password) {
    const passwordHash = await bcrypt.hash(password, 12);
    await db.insert(usersTable).values({
      username,
      passwordHash,
      role: "reseller",
      resellerId: reseller.id,
    });
    req.log.info({ username, resellerId: reseller.id }, "Created reseller user account");
  }

  res.status(201).json(reseller);
});

router.get("/resellers/:id", async (req, res): Promise<void> => {
  const params = GetResellerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (req.user!.role === "reseller" && req.user!.resellerId !== params.data.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [reseller] = await db
    .select()
    .from(resellersTable)
    .where(eq(resellersTable.id, params.data.id));

  if (!reseller) {
    res.status(404).json({ error: "Reseller not found" });
    return;
  }

  res.json(reseller);
});

router.patch("/resellers/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateResellerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateResellerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [reseller] = await db
    .update(resellersTable)
    .set(parsed.data)
    .where(eq(resellersTable.id, params.data.id))
    .returning();

  if (!reseller) {
    res.status(404).json({ error: "Reseller not found" });
    return;
  }

  res.json(reseller);
});

router.delete("/resellers/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteResellerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [reseller] = await db
    .delete(resellersTable)
    .where(eq(resellersTable.id, params.data.id))
    .returning();

  if (!reseller) {
    res.status(404).json({ error: "Reseller not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/resellers/:id/credits", requireAdmin, async (req, res): Promise<void> => {
  const params = TopupResellerCreditsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = TopupResellerCreditsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(resellersTable)
    .where(eq(resellersTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Reseller not found" });
    return;
  }

  const [reseller] = await db
    .update(resellersTable)
    .set({ credits: existing.credits + parsed.data.amount })
    .where(eq(resellersTable.id, params.data.id))
    .returning();

  await db.insert(creditTransactionsTable).values({
    entityType: "reseller",
    entityId: params.data.id,
    amount: parsed.data.amount,
    type: "credit",
    description: parsed.data.description ?? `Credit top-up of ${parsed.data.amount}`,
  });

  res.json(reseller);
});

export default router;
