import { Router, type IRouter } from "express";
import { eq, and, type SQL } from "drizzle-orm";
import { db, creditTransactionsTable } from "@workspace/db";
import { ListCreditTransactionsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/credits/transactions", async (req, res): Promise<void> => {
  const query = ListCreditTransactionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions: SQL[] = [];
  if (query.data.entityType) {
    conditions.push(eq(creditTransactionsTable.entityType, query.data.entityType));
  }
  if (query.data.entityId) {
    conditions.push(eq(creditTransactionsTable.entityId, query.data.entityId));
  }

  const limit = query.data.limit ?? 50;

  const transactions = await db
    .select()
    .from(creditTransactionsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(creditTransactionsTable.createdAt)
    .limit(limit);

  res.json(transactions);
});

export default router;
