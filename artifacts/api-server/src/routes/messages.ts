import { Router, type IRouter } from "express";
import { eq, and, type SQL } from "drizzle-orm";
import { db, messagesTable, resellersTable, clientsTable, creditTransactionsTable } from "@workspace/db";
import {
  ListMessagesQueryParams,
  SendMessageBody,
  GetMessageParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function normalizeRecipient(raw: string): string {
  const digits = raw.replace(/[\s\-\+]/g, "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("69")) {
    return `30${digits}`;
  }
  return digits;
}

async function sendViaGatewayApi(
  recipient: string,
  message: string,
): Promise<{ success: true; msgId: string } | { success: false; errorText: string }> {
  const token = process.env.GATEWAYAPI_TOKEN;
  if (!token) {
    return { success: false, errorText: "GATEWAYAPI_TOKEN is not configured" };
  }

  const normalizedRecipient = normalizeRecipient(recipient);

  let response: Response;
  let responseText: string;
  try {
    response = await fetch("https://messaging.gatewayapi.com/mobile/single", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: "SmartVoIP",
        message,
        recipient: parseInt(normalizedRecipient, 10),
      }),
    });
    responseText = await response.text();
  } catch (err) {
    const errorText = err instanceof Error ? err.message : String(err);
    logger.error({ errorText }, "GatewayAPI network error");
    return { success: false, errorText: `Network error: ${errorText}` };
  }

  if (response.status === 202) {
    let msgId = "";
    try {
      const json = JSON.parse(responseText) as { msg_id?: string | number };
      msgId = String(json.msg_id ?? "");
    } catch {
      msgId = "";
    }
    return { success: true, msgId };
  }

  const errorText = `GatewayAPI error ${response.status}: ${responseText}`;
  logger.warn({ status: response.status, body: responseText }, "GatewayAPI non-202 response");
  return { success: false, errorText };
}

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

  let entityType: "reseller" | "client" | null = null;
  let entityId: number | null = null;
  let currentCredits = 0;

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
      res.status(400).json({ error: `Insufficient credits — reseller has ${reseller.credits}, needs ${creditsCost}` });
      return;
    }

    entityType = "reseller";
    entityId = reseller.id;
    currentCredits = reseller.credits;
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
      res.status(400).json({ error: `Insufficient credits — client has ${client.credits}, needs ${creditsCost}` });
      return;
    }

    entityType = "client";
    entityId = client.id;
    currentCredits = client.credits;
  }

  req.log.info(
    { to: parsed.data.toNumber, entityType, entityId },
    "Sending SMS via GatewayAPI",
  );

  const result = await sendViaGatewayApi(parsed.data.toNumber, parsed.data.body);

  if (result.success) {
    if (entityType === "reseller" && entityId !== null) {
      await db
        .update(resellersTable)
        .set({ credits: currentCredits - creditsCost })
        .where(eq(resellersTable.id, entityId));
    } else if (entityType === "client" && entityId !== null) {
      await db
        .update(clientsTable)
        .set({ credits: currentCredits - creditsCost })
        .where(eq(clientsTable.id, entityId));
    }

    if (entityType && entityId !== null) {
      await db.insert(creditTransactionsTable).values({
        entityType,
        entityId,
        amount: creditsCost,
        type: "debit",
        description: `SMS sent to ${parsed.data.toNumber}`,
      });
    }

    const [message] = await db
      .insert(messagesTable)
      .values({
        resellerId: parsed.data.resellerId ?? null,
        clientId: parsed.data.clientId ?? null,
        toNumber: normalizeRecipient(parsed.data.toNumber),
        fromNumber: parsed.data.fromNumber,
        body: parsed.data.body,
        status: "sent",
        creditsCost,
        gatewayMessageId: result.msgId || null,
        gatewayErrorText: null,
        sentAt: new Date(),
      })
      .returning();

    req.log.info({ gatewayMsgId: result.msgId }, "SMS sent successfully");
    res.status(201).json(message);
  } else {
    const [message] = await db
      .insert(messagesTable)
      .values({
        resellerId: parsed.data.resellerId ?? null,
        clientId: parsed.data.clientId ?? null,
        toNumber: normalizeRecipient(parsed.data.toNumber),
        fromNumber: parsed.data.fromNumber,
        body: parsed.data.body,
        status: "failed",
        creditsCost: 0,
        gatewayMessageId: null,
        gatewayErrorText: result.errorText,
        sentAt: null,
      })
      .returning();

    req.log.warn({ errorText: result.errorText }, "SMS send failed");
    res.status(201).json(message);
  }
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
