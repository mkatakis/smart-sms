import { Router, type IRouter } from "express";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import { db, clientsTable, creditTransactionsTable } from "@workspace/db";
import {
  ListClientsQueryParams,
  CreateClientBody,
  GetClientParams,
  UpdateClientParams,
  UpdateClientBody,
  DeleteClientParams,
  TopupClientCreditsParams,
  TopupClientCreditsBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/clients", async (req, res): Promise<void> => {
  const query = ListClientsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions: SQL[] = [];

  if (req.user!.role === "reseller") {
    conditions.push(eq(clientsTable.resellerId, req.user!.resellerId!));
  } else if (query.data.resellerId) {
    conditions.push(eq(clientsTable.resellerId, query.data.resellerId));
  }

  if (query.data.status) conditions.push(eq(clientsTable.status, query.data.status));
  if (query.data.search) conditions.push(ilike(clientsTable.name, `%${query.data.search}%`));

  const clients = await db
    .select()
    .from(clientsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(clientsTable.createdAt);

  res.json(clients);
});

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (req.user!.role === "reseller" && parsed.data.resellerId !== req.user!.resellerId) {
    res.status(403).json({ error: "Forbidden: cannot create client for another reseller" });
    return;
  }

  const [client] = await db
    .insert(clientsTable)
    .values({ ...parsed.data, credits: parsed.data.credits ?? 0 })
    .returning();

  res.status(201).json(client);
});

async function checkClientOwnership(
  clientId: number,
  resellerId: number | null,
): Promise<{ client: typeof clientsTable.$inferSelect } | { error: string; status: number }> {
  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, clientId));

  if (!client) return { error: "Client not found", status: 404 };
  if (resellerId !== null && client.resellerId !== resellerId) {
    return { error: "Not found", status: 404 };
  }
  return { client };
}

router.get("/clients/:id", async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const scoped = req.user!.role === "reseller" ? req.user!.resellerId : null;
  const result = await checkClientOwnership(params.data.id, scoped);

  if ("error" in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json(result.client);
});

router.patch("/clients/:id", async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const scoped = req.user!.role === "reseller" ? req.user!.resellerId : null;
  const check = await checkClientOwnership(params.data.id, scoped);
  if ("error" in check) {
    res.status(check.status).json({ error: check.error });
    return;
  }

  const [client] = await db
    .update(clientsTable)
    .set(parsed.data)
    .where(eq(clientsTable.id, params.data.id))
    .returning();

  res.json(client);
});

router.delete("/clients/:id", async (req, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const scoped = req.user!.role === "reseller" ? req.user!.resellerId : null;
  const check = await checkClientOwnership(params.data.id, scoped);
  if ("error" in check) {
    res.status(check.status).json({ error: check.error });
    return;
  }

  await db.delete(clientsTable).where(eq(clientsTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/clients/:id/credits", async (req, res): Promise<void> => {
  const params = TopupClientCreditsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = TopupClientCreditsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const scoped = req.user!.role === "reseller" ? req.user!.resellerId : null;
  const check = await checkClientOwnership(params.data.id, scoped);
  if ("error" in check) {
    res.status(check.status).json({ error: check.error });
    return;
  }

  const [client] = await db
    .update(clientsTable)
    .set({ credits: check.client.credits + parsed.data.amount })
    .where(eq(clientsTable.id, params.data.id))
    .returning();

  await db.insert(creditTransactionsTable).values({
    entityType: "client",
    entityId: params.data.id,
    amount: parsed.data.amount,
    type: "credit",
    description: parsed.data.description ?? `Credit top-up of ${parsed.data.amount}`,
  });

  res.json(client);
});

export default router;
