import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import Anthropic from "@anthropic-ai/sdk";
import { ratelimit } from "@/lib/ratelimit";
import { sql } from "drizzle-orm";

const db = drizzle(neon(process.env.DATABASE_URL!));
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const embedQuery = async (text: string): Promise<number[]> => {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: [text],
      model: "voyage-3",
    }),
  });
  const data = await res.json();
  return data.data[0].embedding;
};

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const { query } = await req.json();
  if (!query?.trim()) {
    return Response.json({ error: "Query is required" }, { status: 400 });
  }

  // 1. Embed the query
  const queryEmbedding = await embedQuery(query);

  // 2. Search pgvector for similar passages
  const results = await db.execute(sql`
    SELECT id, novel, text, char_count,
      1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
    FROM passages
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT 8
  `);

  const foundPassages = results.rows as {
    id: number;
    novel: string;
    text: string;
    similarity: number;
  }[];

  // 3. Generate summary with Claude
  const passageContext = foundPassages
    .map((p, i) => `[${i + 1}] ${p.novel}: "${p.text}"`)
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Based only on these passages from Jane Austen's novels, write a 2-3 sentence synthesis of what Austen says about: "${query}"\n\nPassages:\n${passageContext}\n\nBe concise and specific. Reference the novels by name.`,
      },
    ],
  });

  const summary =
    message.content[0].type === "text" ? message.content[0].text : "";

  return Response.json({ summary, passages: foundPassages });
}
