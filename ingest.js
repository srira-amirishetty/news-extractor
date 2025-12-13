import fs from "fs/promises";
import path from "path";
import axios from "axios";
import {glob} from "glob";
// import { QdrantClient } from "qdrant-client";
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";

dotenv.config();

const JINA_API_KEY = process.env.JINA_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const COLLECTION_NAME = process.env.COLLECTION_NAME || "news_articles";

if (!JINA_API_KEY || !QDRANT_URL) {
  console.error("❌ Missing environment variables.");
  process.exit(1);
}

const qdrant = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
  checkCompatibility: false
});

// ---------- Utility Functions ----------
// async function listTextFiles(dir) {
//   return new Promise((resolve, reject) => {
//     glob(`${dir}/**/*.txt`, (err, files) => {
//       if (err) reject(err);
//       else resolve(files);
//     });
//   });
// }

async function listTextFiles(dir) {
  return await glob("*.txt", {
    cwd: dir,
    absolute: true,
    nocase: true,
    windowsPathsNoEscape: true
  });
}

async function readArticleAsString(filePath) {
  return fs.readFile(filePath, "utf8");
}

function chunkText(text, chunkSize = 800, overlap = 150) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    chunks.push(text.slice(start, end));
    start = end - overlap;
  }
  return chunks;
}

export async function embedText(textArray) {
  const response = await axios.post(
    "https://api.jina.ai/v1/embeddings",
    {
      model: "jina-embeddings-v3",
      input: textArray,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${JINA_API_KEY}`,
      },
    }
  );

  return response.data.data.map((e) => e.embedding);
}

// ---------- Main Ingest Flow ----------
async function main() {
  console.log("📁 Reading article files...");
//   const files = await listTextFiles("./data");

console.log("Current working directory:", process.cwd());
console.log("Looking for files inside:", path.resolve("data"));

const files = await listTextFiles(path.resolve("data"));
console.log("FOUND FILES:", files);

  if (!files.length) {
    console.log("No .txt files found in data/");
    return;
  }

  console.log("Found", files.length, "files");

  // Create Qdrant collection if needed
  try {
    await qdrant.getCollection(COLLECTION_NAME);
  } catch {
    console.log(`🆕 Creating Qdrant collection: ${COLLECTION_NAME}`);
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: { size: 1024, distance: "Cosine" },
    });
  }

  let globalId = 1;

  for (const filePath of files) {
    console.log(`\n📄 Processing: ${filePath}`);

    const raw = await readArticleAsString(filePath);
    const chunks = chunkText(raw);

    console.log("🔹 Chunks:", chunks.length);

    // Embed all chunks of the article
    const embeddings = await embedText(chunks);

    // Prepare points for Qdrant
    const points = embeddings.map((vector, idx) => ({
      id: globalId++,
      vector,
      payload: {
        source: path.basename(filePath),
        text: chunks[idx],
      },
    }));

    // Upsert into Qdrant
    await qdrant.upsert(COLLECTION_NAME, { points });

    console.log(`✅ Upserted ${points.length} chunks from ${filePath}`);
  }

  console.log("\n🎉 Ingestion complete!");
}

main();
