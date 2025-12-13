import axios from "axios";
// import { QdrantClient } from "qdrant-client";
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";

dotenv.config();

const JINA_API_KEY = process.env.JINA_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const COLLECTION_NAME = process.env.COLLECTION_NAME || "news_articles";

const qdrant = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

async function embedQuery(query) {
  const response = await axios.post(
    "https://api.jina.ai/v1/embeddings",
    {
      model: "jina-embeddings-v3",
      input: [query],
    },
    {
      headers: {
        Authorization: `Bearer ${JINA_API_KEY}`,
      },
    }
  );

  return response.data.data[0].embedding;
}

async function search(query) {
  console.log("🔍 Embedding query…");
  const queryVector = await embedQuery(query);

  console.log("📡 Searching Qdrant…");

  const results = await qdrant.search(COLLECTION_NAME, {
    vector: queryVector,
    limit: 5,
  });

  console.log("\n🎯 Top Results:");
  for (const r of results) {
    console.log("----");
    console.log("Score:", r.score.toFixed(4));
    console.log("Source:", r.payload.source);
    console.log("Text:", r.payload.text.slice(0, 300) + "...");
  }
}

search("What did CCI say about IndiGo?");
