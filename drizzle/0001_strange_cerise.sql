CREATE TABLE "searches" (
	"id" serial PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"summary" text NOT NULL,
	"passages" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "searches_query_unique" UNIQUE("query")
);
