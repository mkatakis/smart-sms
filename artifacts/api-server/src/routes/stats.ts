import { Router, type IRouter } from "express";
import { eq, count, sum } from "drizzle-orm";
import { db, resellersTable, clientsTable, messagesTable, creditTransactionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const [totalResellersResult] = await db.select({ count: count() }).from(resellersTable);
  const [activeResellersResult] = await db
    .select({ count: count() })
    .from(resellersTable)
    .where(eq(resellersTable.status, "active"));

  const [totalClientsResult] = await db.select({ count: count() }).from(clientsTable);
  const [activeClientsResult] = await db
    .select({ count: count() })
    .from(clientsTable)
    .where(eq(clientsTable.status, "active"));

  const [totalMessagesResult] = await db.select({ count: count() }).from(messagesTable);

  const [totalCreditsResult] = await db
    .select({ total: sum(creditTransactionsTable.amount) })
    .from(creditTransactionsTable)
    .where(eq(creditTransactionsTable.type, "credit"));

  const recentMessages = await db
    .select()
    .from(messagesTable)
    .orderBy(messagesTable.createdAt)
    .limit(10);

  res.json({
    totalResellers: totalResellersResult?.count ?? 0,
    activeResellers: activeResellersResult?.count ?? 0,
    totalClients: totalClientsResult?.count ?? 0,
    activeClients: activeClientsResult?.count ?? 0,
    totalMessagesSent: totalMessagesResult?.count ?? 0,
    totalCreditsIssued: Number(totalCreditsResult?.total ?? 0),
    recentMessages,
  });
});

router.get("/stats/messages", async (_req, res): Promise<void> => {
  const statuses = ["queued", "sent", "delivered", "failed"];

  const results = await Promise.all(
    statuses.map(async (status) => {
      const [result] = await db
        .select({ count: count() })
        .from(messagesTable)
        .where(eq(messagesTable.status, status));
      return { status, count: result?.count ?? 0 };
    })
  );

  res.json(results);
});

export default router;
