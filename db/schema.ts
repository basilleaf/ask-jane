import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";

export const passages = pgTable(
  "passages",
  {
    id: serial("id").primaryKey(),
    novel: text("novel").notNull(),
    chapter: integer("chapter"),
    chapterTitle: text("chapter_title"),
    text: text("text").notNull(),
    charCount: integer("char_count"),
    embedding: vector("embedding", { dimensions: 1024 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    embeddingIndex: index("passages_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  }),
);
