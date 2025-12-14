**Cloning the Repository**

```bash
git clone https://github.com/srira-amirishetty/gta_vi_landing_page_animation.git
cd news-extractor
```
Frontend Environment Variables

create .env file and paste

```bash
VITE_API_URL=http://localhost:3000
```

**Installation**

Frontend SetUp

```bash
cd frontend/frontend
npm install
npm run dev
```

Backend Setup

open new terminal and run 


Backend Environment Variables

create .env file and paste

```bash
JINA_API_KEY=your_jina_api_key
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=yout_qdrant_api_key
COLLECTION_NAME=news_articles
GEMINI_API_KEY=your_gemini_api_key
REDIS_URL=your_redis_url
PORT=3000
```

For Running Backend

 ```bash
npm install
nodemon index.js
```

For News Ingestion

open new terminal and run

 ```bash
node ingest.js
```


Below is a clean, professional GitHub README tailored for your assignment.
You can paste it directly into your project’s README.md.

It clearly explains:

✔ Tech stack
✔ RAG pipeline
✔ Backend
✔ Frontend
✔ Redis (1-hour TTL)
✔ Qdrant
✔ Gemini LLM
✔ Streaming responses
✔ Setup steps
✔ API endpoints
✔ Folder structure
✔ Screenshots placeholders
✔ Everything required for a Full-Stack Developer assignment at Voosh

📄 README.md
🚀 RAG-Powered News Chatbot

A full-stack Retrieval-Augmented Generation (RAG) chatbot that answers questions over a news corpus.
Built as part of a Full-Stack Developer assignment.

This system ingests ~50+ news articles, embeds them, stores them in a vector database, retrieves relevant chunks using semantic search, and then generates an answer using Gemini 1.5 Flash with RAG-context injection.

🧠 Tech Stack
🔹 Backend (Node.js + Express)

Node.js + Express — REST API for chat, sessions, streaming

Gemini 1.5 Flash (Google API) — final answer generation (LLM)

Jina Embeddings v3 — high-quality free-tier embeddings (1024 dimensions)

Qdrant Vector Database — semantic search for article chunks

Redis (Upstash or Local Redis)

stores per-session chat history

TTL = 1 hour

resets session on demand

Streaming (SSE) — real-time token-level responses like ChatGPT

🔹 Frontend (React + SCSS)

React + Vite

Chat UI with message bubbles

Streaming typing animation

Reset conversation button

Persistent session (stored in localStorage)

🔹 Deployment Ready

Works with Render / Railway / Vercel

Suitable for production use with small modifications

🔍 System Architecture
User → React Frontend → Express Backend → Redis (session storage)
                                      → Qdrant (vector search)
                                      → Jina (embeddings)
                                      → Gemini (LLM)

📌 Features
✅ 1. RAG Pipeline

Ingests ~50 news articles

Splits into 500–800 character chunks

Generates embeddings via Jina v3

Stores vectors + payload in Qdrant

Retrieves top-k relevant chunks

Sends them to Gemini for grounded answers

✅ 2. Session-Based Chat

Each new user → new session ID

Chat stored in Redis

TTL = 1 hour

Session reset clears only that session’s history

✅ 3. Gemini-Powered Answering

Uses generateContentStream() for streaming

RAG ensures answers are article-grounded, non-hallucinatory

✅ 4. Frontend Chat UI

Bubbles for user & assistant

Auto-scroll

Streaming token-by-token output

Reset button

History loaded on page refresh
