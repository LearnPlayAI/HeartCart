import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema";

// Notifications table for credit system notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  type: text("type").notNull(), // 'credit_issued', 'order_status', 'supplier_unavailable'
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").notNull().default(false),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
});

// Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

// Insert schemas
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Types
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;