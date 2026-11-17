import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** Members of the board ("profiles" in the original plan). */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  isAdmin: boolean("is_admin").notNull().default(false),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  createdAt: createdAt(),
});

/** Only emails on this list (or in ADMIN_EMAILS) can sign in. */
export const invites = pgTable("invites", {
  email: text("email").primaryKey(),
  invitedById: uuid("invited_by_id").references(() => users.id, { onDelete: "set null" }),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: createdAt(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});

/** One-time magic-link tokens. Only a SHA-256 hash of the token is stored. */
export const loginTokens = pgTable(
  "login_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    email: text("email").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("login_tokens_email_idx").on(t.email, t.createdAt)],
);

/** Signed-in sessions. Only a SHA-256 hash of the cookie value is stored. */
export const sessions = pgTable(
  "sessions",
  {
    idHash: text("id_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const topicStatus = pgEnum("topic_status", ["open", "active", "wrapped_up"]);
export type TopicStatus = (typeof topicStatus.enumValues)[number];

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    task: text("task").notNull(),
    goal: text("goal").notNull(),
    bodyMd: text("body_md").notNull().default(""),
    status: topicStatus("status").notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /** Bumped when the topic is created or someone adds progress. Drives sorting by activity and "new" markers. */
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("topics_created_idx").on(t.createdAt), index("topics_status_idx").on(t.status)],
);

export const progressEntries = pgTable(
  "progress_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    bodyMd: text("body_md").notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("progress_topic_idx").on(t.topicId, t.createdAt)],
);

export const attachmentStatus = pgEnum("attachment_status", ["pending", "uploaded"]);

/**
 * A file belongs to a topic OR a progress entry. While the form that will own it is
 * still being filled in, it belongs to neither (it is "unattached").
 */
export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "cascade" }),
    progressEntryId: uuid("progress_entry_id").references(() => progressEntries.id, { onDelete: "cascade" }),
    uploaderId: uuid("uploader_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    storageKey: text("storage_key").notNull().unique(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    status: attachmentStatus("status").notNull().default("pending"),
    createdAt: createdAt(),
  },
  (t) => [
    check("attachments_one_parent", sql`${t.topicId} IS NULL OR ${t.progressEntryId} IS NULL`),
    index("attachments_topic_idx").on(t.topicId),
    index("attachments_entry_idx").on(t.progressEntryId),
  ],
);

/** When each member last looked at each topic (for "new since your last visit"). */
export const topicReads = pgTable(
  "topic_reads",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.topicId] })],
);

export type User = typeof users.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type ProgressEntry = typeof progressEntries.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
