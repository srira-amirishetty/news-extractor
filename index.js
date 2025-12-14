import express from "express";
import cors from "cors";
import dotenv from "dotenv"
import {v4 as uuidv4 } from "uuid";
import { QdrantClient } from "@qdrant/js-client-rest";
import { redisClient } from "./redis.js";
import { GoogleGenerativeAI } from "@google/generative-ai";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json())

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const gemini = genAI.getGenerativeModel({model:"gemini-2.5-flash"})

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false,
});

//redis
const SESSION_KEY = (id) => `session:${id}:history`;
const TTL_SECONDS = 3600;

async function embed(text) {
  const r = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "jina-embeddings-v3",
      input: [text],
    }),
  });
  const j = await r.json();
  return j.data[0].embedding;
}


//routes

//create session
app.post("/session", async (req,res) => {
    const id = uuidv4();
    console.log(id)
    await redisClient.del(SESSION_KEY(id))
    res.json({sessonId:id})
})

//get chat history
app.get("/session/:id/history",async (req,res) => {
    const items = await redisClient.lRange(SESSION_KEY(req.params.id),0,-1);
    const history = items.map((x)=>JSON.parse(x))
    res.json({history})
})

//reset chat history
app.post("/session/:id/reset",async (req,res) => {
    await redisClient.del(SESSION_KEY(req.params.id))
    res.json({ok:true})
})

app.post("/session/:id/chat",async (req,res) => {
    const sessionId = req.params.id;
    const message = req.body.message;
    if(!message) return res.status(400).json({error:"Message required"});

    await redisClient.rPush(SESSION_KEY(sessionId),JSON.stringify({role:"user", text:message}))
    await redisClient.expire(SESSION_KEY(sessionId), TTL_SECONDS)

    const queryVector = await embed(message)

    console.log("Query vector length:", queryVector.length);


    const results = await qdrant.search(process.env.COLLECTION_NAME,{
        vector:queryVector,
        limit:5
    })

    const context = results.map((r) => r.payload.text).join("\n\n---\n\n")
    const sources = results.map((r) => r.payload.source)

const prompt = `
You are a RAG-powered assistant. Use ONLY the context below to answer.

CONTEXT:
${context}

QUESTION:
${message}

RULES:
- If the answer is not in the context, say "No information found."
- Keep answer short and factual.
`;

const geminiResponse = await gemini.generateContent(prompt)
const answer = geminiResponse.response.text()

await redisClient.rPush(SESSION_KEY(sessionId),JSON.stringify({role:"assistant",text:answer}))
await redisClient.expire(SESSION_KEY(sessionId), TTL_SECONDS)

res.json({answer,sources})
})

app.post("/session/:id/chat/stream", async (req, res) => {
  const sessionId = req.params.id;
  const message = req.body.message;

  // SSE headers for streaming
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Save user message to Redis
  await redisClient.rPush(
    SESSION_KEY(sessionId),
    JSON.stringify({ role: "user", text: message })
  );
  await redisClient.expire(SESSION_KEY(sessionId), TTL_SECONDS);

  // 1️⃣ Embed query
  const queryVector = await embed(message);

  // 2️⃣ Retrieve context from Qdrant
  const searchResults = await qdrant.search(process.env.COLLECTION_NAME, {
    vector: queryVector,
    limit: 5,
  });

  const context = searchResults.map((r) => r.payload.text).join("\n---\n");

  // 3️⃣ Build prompt
  const prompt = `
Use ONLY the context to answer.

CONTEXT:
${context}

QUESTION:
${message}

If answer not present, say "No information found."
`;

  // 4️⃣ Streaming from Gemini
  const stream = await gemini.generateContentStream(prompt);

  let finalAnswer = "";

  for await (const chunk of stream.stream) {
    const part = chunk.text();
    finalAnswer += part;

    // send partial token to frontend
    res.write(`data: ${JSON.stringify({ token: part })}\n\n`);
  }

  // Save final assistant message
  await redisClient.rPush(
    SESSION_KEY(sessionId),
    JSON.stringify({ role: "assistant", text: finalAnswer })
  );
  await redisClient.expire(SESSION_KEY(sessionId), TTL_SECONDS);

  // End SSE stream
  res.write(`data: [DONE]\n\n`);
  res.end();
});


app.listen(process.env.PORT || 3000, () =>
  console.log("Server running on port", process.env.PORT)
);

