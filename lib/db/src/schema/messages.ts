import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  resellerId: integer("reseller_id"),
  clientId: integer("client_id"),
  toNumber: text("to_number").notNull(),
  fromNumber: text("from_number").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("queued"),
  creditsCost: integer("credits_cost").notNull().default(1),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
