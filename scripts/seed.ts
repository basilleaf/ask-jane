import { config } from "dotenv";
config({ path: ".env" });

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { passages } from "../db/schema";
import { VoyageAIClient } from "voyageai";

// npx tsx scripts/seed.ts

const NOVELS = [
  { title: "Pride and Prejudice", gutenbergId: 42671 },
  { title: "Sense and Sensibility", gutenbergId: 161 },
  { title: "Emma", gutenbergId: 158 },
  { title: "Persuasion", gutenbergId: 105 },
  { title: "Mansfield Park", gutenbergId: 141 },
  { title: "Northanger Abbey", gutenbergId: 121 },
];

const BATCH_SIZE = 10; // Voyage free trial

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);
const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY! });

const stripGutenberg = (text: string): string => {
  const normalized = text.replace(/\r\n/g, "\n");
  const start = normalized.indexOf("*** START OF");
  const end = normalized.indexOf("*** END OF");
  if (start === -1 || end === -1) return normalized;
  return normalized.slice(normalized.indexOf("\n", start) + 1, end).trim();
};

const chunkText = (text: string): string[] => {
  return text
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter((p) => p.length > 150 && p.length < 1500)
    .filter((p) => !p.match(/^CHAPTER/i))
    .filter((p) => !p.match(/^\[/))
    .filter((p) => !p.match(/^Note: Project Gutenberg/))
    .filter((p) => !p.match(/VOLUME\s+(I|II|III)/));
};

const gutenbergUrl = (id: number) =>
  `https://www.gutenberg.org/files/${id}/${id}-0.txt`;

const fetchNovel = async (id: number) => {
  const response = await fetch(gutenbergUrl(id));
  return response.text();
};

// Voyage allows up to 128 texts per batch
const embedBatch = async (texts: string[]): Promise<number[][]> => {
  const result = await voyage.embed({
    input: texts,
    model: "voyage-3",
  });

  return (result.data ?? [])
    .map((d) => d.embedding)
    .filter((embedding): embedding is number[] => Array.isArray(embedding));
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const seed = async () => {
  for (const novel of NOVELS) {
    console.log(`\nProcessing ${novel.title}...`);
    const text = await fetchNovel(novel.gutenbergId);
    const stripped = stripGutenberg(text);
    const chunks = chunkText(stripped);
    console.log(`  ${chunks.length} chunks`);

    // Process in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await embedBatch(batch);

      await db.insert(passages).values(
        batch.map((text, j) => ({
          novel: novel.title,
          text,
          charCount: text.length,
          embedding: embeddings[j],
        })),
      );

      console.log(
        `  inserted ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length}`,
      );
      console.log("sleeping for 21 seconds");
      await sleep(21000);
    }

    console.log(`  ✓ ${novel.title} done`);
  }

  console.log("\n✓ All novels seeded!");
};

seed();
