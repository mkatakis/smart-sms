import { Router, type IRouter } from "express";
import { eq, and, type SQL } from "drizzle-orm";
import { db, messagesTable, resellersTable, clientsTable, creditTransactionsTable } from "@workspace/db";
import {
  ListMessagesQueryParams,
  SendMessageBody,
  GetMessageParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/messages", async (req, res): Promise<void> => {
  const query = ListMessagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions: SQL[] = [];
  if (query.data.resellerId) {
    conditions.push(eq(messagesTable.resellerId, query.data.resellerId));
  }
  if (query.data.clientId) {
    conditions.push(eq(messagesTable.clientId, query.data.clientId));
  }
  if (query.data.status) {
    conditions.push(eq(messagesTable.status, query.data.status));
  }

  const limit = query.data.limit ?? 50;

  const messages = await db
    .select()
    .from(messagesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(messagesTable.createdAt)
    .limit(limit);

  res.json(messages);
});

router.post("/messages/send", async (req, res): Promise<void> => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const creditsCost = 1;

  if (parsed.data.resellerId) {
    const [reseller] = await db
      .select()
      .from(resellersTable)
      .where(eq(resellersTable.id, parsed.data.resellerId));

    if (!reseller) {
      res.status(404).json({ error: "Reseller not found" });
      return;
    }

    if (reseller.credits < creditsCost) {
      res.status(400).json({ error: "Insufficient credits" });
      return;
    }

    await db
      .update(resellersTable)
      .set({ credits: reseller.credits - creditsCost })
      .where(eq(resellersTable.id, parsed.data.resellerId));

    await db.insert(creditTransactionsTable).values({
      entityType: "reseller",
      entityId: parsed.data.resellerId,
      amount: creditsCost,
      type: "debit",
      description: `SMS sent to ${parsed.data.toNumber}`,
    });
  } else if (parsed.data.clientId) {
    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, parsed.data.clientId));

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    if (client.credits < creditsCost) {
      res.status(400).json({ error: "Insufficient credits" });
      return;
    }

    await db
      .update(clientsTable)
      .set({ credits: client.credits - creditsCost })
      .where(eq(clientsTable.id, parsed.data.clientId));

    await db.insert(creditTransactionsTable).values({
      entityType: "client",
      entityId: parsed.data.clientId,
      amount: creditsCost,
      type: "debit",
      description: `SMS sent to ${parsed.data.toNumber}`,
    });
  }

  const statuses = ["sent", "delivered", "failed"];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

  const [message] = await db
    .insert(messagesTable)
    .values({
      resellerId: parsed.data.resellerId ?? null,
      clientId: parsed.data.clientId ?? null,
      toNumber: parsed.data.toNumber,
      fromNumber: parsed.data.fromNumber,
      body: parsed.data.body,
      status: randomStatus,
      creditsCost,
      sentAt: new Date(),
    })
    .returning();

  res.status(201).json(message);
});

router.get("/messages/:id", async (req, res): Promise<void> => {
  const params = GetMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [message] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, params.data.id));

  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  res.json(message);
});

export default router;
