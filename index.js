import express from "express";
import cors from "cors";
import dotenv from "dotenv"
import {v4 as uuidv4 } from "uuid";
import { QdrantClient } from "@qdrant/js-client-rest";
import { redisClient } from "./redis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { embedText } from "./ingest";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json())

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const gemini = genAI.getGenerativeModel({model:"gemini-1.5-flash"})

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false,
});

//redis
const SESSION_KEY = (id) => `session:${id}:history`;
const TTL_SECONDS = 3600;

//routes

//create session
app.post("/session", async (req,res) => {
    const id = uuidv4();
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

    const queryVector = await embedText(message)

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

