import React, { useEffect, useState } from "react";
import MessageBubble from "./MessageBubble";
import InputBox from "./InputBox";
import {
  createSession,
  getHistory,
  sendMessage,
  resetSession,
} from "../api";

const API_URL = import.meta.env.VITE_API_URL; 

export default function ChatWindow() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);

useEffect(() => {
  async function init() {
    let id = localStorage.getItem("sessionId");

    console.log(id)

    if (!id) {
      const s = await createSession();
      id = s.sessonId;
      console.log("id",id,s.sessonId)
      localStorage.setItem("sessionId", id);
    }

    setSessionId(id);

    const h = await getHistory(id);
    setMessages(h?.history ?? []);
  }

  init();
}, []);

useEffect(() => {
  console.log("sessionId updated:", sessionId);
}, [sessionId])



const handleSend = async (msg) => {
  const userMsg = { role: "user", text: msg };
  setMessages((prev) => [...prev, userMsg]);

  let botText = "";
  setTyping(true);

  const response = await fetch(`${API_URL}/session/${sessionId}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);

    // parse SSE "data: {...}"
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data:")) {
        const data = line.replace("data:", "").trim();

        if (data === "[DONE]") {
          setTyping(false);
          return;
        }

        try {
          const tokenObj = JSON.parse(data);
          botText += tokenObj.token;

          // live update typing
          setMessages((prev) => {
            const copy = [...prev];
            // replace last bot message or create one
            const last = copy[copy.length - 1];
            if (last && last.role === "assistant") {
              last.text = botText;
            } else {
              copy.push({ role: "assistant", text: botText });
            }
            return copy;
          });
        } catch {}
      }
    }
  }
};


  const handleReset = async () => {
    await resetSession(sessionId);
    setMessages([]);
  };

  return (
    <div className="chat-container">
      <div className="header">
        <h2>RAG News Chatbot</h2>
        <button className="reset-btn" onClick={handleReset}>Reset</button>
      </div>

      <div className="messages">
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} text={m.text} />
        ))}

        {typing && <MessageBubble role="assistant" text="Typing..." />}
      </div>

      <InputBox onSend={handleSend} />
    </div>
  );
}
