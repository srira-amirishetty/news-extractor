import React, { useEffect, useState } from "react";
import MessageBubble from "./MessageBubble";
import InputBox from "./InputBox";
import {
  createSession,
  getHistory,
  sendMessage,
  resetSession,
} from "../api";

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

    setMessages((p) => [...p, userMsg]);
    setTyping(true);

    const response = await sendMessage(sessionId, msg);

    const botMsg = { role: "assistant", text: response.answer };

    setMessages((p) => [...p, botMsg]);
    setTyping(false);
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
